import { Router } from "express";
import { Types } from "mongoose";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import {
  createPurchaseOrderBody,
  CreatePurchaseOrderInput,
  fakePaymentBody,
  FakePaymentInput,
  updatePurchaseOrderBody,
  updatePurchaseOrderStatusBody,
  UpdatePurchaseOrderStatusInput
} from "../schemas";
import { IngredientModel, PurchaseOrderModel, SupplierModel } from "../models";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";
import { IUser } from "../models";
import { BusinessUnit, PurchaseOrderStatus } from "../types/business";

const purchaseOrderRouter = Router();

type OrderItemInput = CreatePurchaseOrderInput["items"][number];

type NormalizedPurchaseOrderItem = {
  ingredient: string;
  ingredientName: string;
  category: string;
  supplier: string | null;
  supplierName: string;
  quantity: number;
  unit: BusinessUnit;
  unitPrice: number;
  stockQuantity: number;
  minimumStock: number;
  recommendedQuantity: number;
  lineTotal: number;
};

type Totals = {
  deliveryFee: number;
  totalExclTax: number;
  vatAmount: number;
  totalInclTax: number;
  totalAmount: number;
};

const DEFAULT_DELIVERY_ADDRESS = "Restaurant Eat Planner, 12 rue des Chefs, 75002 Paris";

const orderPopulate = [
  { path: "supplier", select: "name productTypes deliveryLeadTimeDays deliveryFee minimumOrderAmount email phone address" },
  { path: "suppliers", select: "name productTypes deliveryLeadTimeDays deliveryFee minimumOrderAmount email phone address" },
  {
    path: "items.ingredient",
    select: "name category unit orderUnit purchasePrice stockQuantity minimumStock averageDailyUsage minimumOrderQuantity supplier active"
  }
];

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CMD-${datePart}-${randomPart}`;
}

function getRecommendedQuantity(ingredient: {
  stockQuantity: number;
  minimumStock: number;
  averageDailyUsage: number;
  minimumOrderQuantity: number;
}, horizonDays = 7) {
  const forecastNeed = ingredient.averageDailyUsage * horizonDays;
  const shortage = Math.max(0, forecastNeed + ingredient.minimumStock - ingredient.stockQuantity);
  if (shortage <= 0) {
    return 0;
  }

  return Math.max(Math.ceil(shortage), ingredient.minimumOrderQuantity || 0);
}

function getSupplierIds(items: NormalizedPurchaseOrderItem[], fallbackSupplierId: string) {
  return [...new Set([
    fallbackSupplierId,
    ...items.map(item => item.supplier).filter((supplier): supplier is string => Boolean(supplier))
  ])];
}

function computeTotals(items: NormalizedPurchaseOrderItem[], deliveryFee: number, vatRate: number): Totals {
  const itemsTotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const totalExclTax = roundMoney(itemsTotal + deliveryFee);
  const vatAmount = roundMoney(totalExclTax * vatRate);
  const totalInclTax = roundMoney(totalExclTax + vatAmount);

  return {
    deliveryFee: roundMoney(deliveryFee),
    totalExclTax,
    vatAmount,
    totalInclTax,
    totalAmount: totalInclTax
  };
}

function computeEstimatedDeliveryDate(
  requestedDeliveryDate: string | undefined,
  estimatedDeliveryDate: string | undefined,
  leadTimeDays: number
) {
  if (requestedDeliveryDate) {
    return requestedDeliveryDate;
  }

  if (estimatedDeliveryDate) {
    return estimatedDeliveryDate;
  }

  return addDaysIso(leadTimeDays);
}

function computeManagementScore(items: NormalizedPurchaseOrderItem[], totals: Totals, budgetReference: number) {
  let score = 0;
  const badges: string[] = [];

  const followedRecommendations = items.length > 0 && items.every((item) => {
    if (item.recommendedQuantity <= 0) {
      return true;
    }

    return item.quantity >= item.recommendedQuantity * 0.8 && item.quantity <= item.recommendedQuantity * 1.25;
  });

  const coversCriticalStock = items.some(item => item.stockQuantity <= item.minimumStock && item.quantity >= item.recommendedQuantity);
  const exceedsNeeds = items.some(item => item.recommendedQuantity > 0 && item.quantity > item.recommendedQuantity * 1.75);
  const respectsBudget = budgetReference <= 0 || totals.totalInclTax <= budgetReference * 1.15;

  if (followedRecommendations) {
    score += 10;
    badges.push("Prevision 7 jours utilisee");
  }

  if (coversCriticalStock) {
    score += 50;
    badges.push("Zero rupture");
  }

  if (respectsBudget) {
    score += 30;
    badges.push("Budget respecte");
  }

  if (!exceedsNeeds) {
    score += 20;
    badges.push("Stock maitrise");
  } else {
    score -= 10;
  }

  return { score, badges: [...new Set(badges)] };
}

async function normalizeOrderItems(user: IUser, items: OrderItemInput[]) {
  const ingredientIds = [...new Set(items.map(item => item.ingredient))];
  const ingredients = await IngredientModel.find(buildAccountScope(user, { _id: { $in: ingredientIds } })).exec();
  const ingredientById = new Map(ingredients.map(ingredient => [String(ingredient._id), ingredient]));

  const supplierIds = [
    ...new Set(
      ingredients
        .map(ingredient => ingredient.supplier ? String(ingredient.supplier) : "")
        .filter(Boolean)
    )
  ];
  const suppliers = await SupplierModel.find(buildAccountScope(user, { _id: { $in: supplierIds } })).exec();
  const supplierById = new Map(suppliers.map(supplier => [String(supplier._id), supplier]));

  const normalizedItems: NormalizedPurchaseOrderItem[] = [];

  for (const item of items) {
    const ingredient = ingredientById.get(item.ingredient);
    if (!ingredient) {
      return null;
    }

    const supplierId = ingredient.supplier ? String(ingredient.supplier) : null;
    const supplier = supplierId ? supplierById.get(supplierId) : null;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    normalizedItems.push({
      ingredient: item.ingredient,
      ingredientName: ingredient.name,
      category: ingredient.category,
      supplier: supplierId,
      supplierName: supplier?.name ?? "",
      quantity,
      unit: item.unit,
      unitPrice,
      stockQuantity: ingredient.stockQuantity,
      minimumStock: ingredient.minimumStock,
      recommendedQuantity: item.recommendedQuantity || getRecommendedQuantity(ingredient),
      lineTotal: roundMoney(quantity * unitPrice)
    });
  }

  return normalizedItems;
}

async function buildOrderFinancials(user: IUser, supplierId: string, items: NormalizedPurchaseOrderItem[], vatRate: number) {
  const supplierIds = getSupplierIds(items, supplierId);
  const suppliers = await SupplierModel.find(buildAccountScope(user, { _id: { $in: supplierIds } })).exec();
  const deliveryFee = suppliers.reduce((sum, supplier) => sum + supplier.deliveryFee, 0);
  const leadTimeDays = suppliers.reduce((max, supplier) => Math.max(max, supplier.deliveryLeadTimeDays), 0);
  const recommendedBudget = items.reduce((sum, item) => sum + item.recommendedQuantity * item.unitPrice, 0) + deliveryFee;
  const totals = computeTotals(items, deliveryFee, vatRate);
  const score = computeManagementScore(items, totals, recommendedBudget);

  return {
    supplierIds,
    leadTimeDays,
    totals,
    score
  };
}

purchaseOrderRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const orders = await PurchaseOrderModel.find(buildAccountScope(user))
    .populate(orderPopulate)
    .sort({ created_at: -1 })
    .exec();

  res.json(orders);
});

purchaseOrderRouter.get("/rewards", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [orders, ingredients] = await Promise.all([
    PurchaseOrderModel.find(buildAccountScope(user)).exec(),
    IngredientModel.find(buildAccountScope(user)).exec()
  ]);

  const score = orders.reduce((sum, order) => sum + (order.managementScoreDelta || 0), 0);
  const paidOrders = orders.filter(order => order.status === "paid" || order.status === "delivered" || order.status === "received");
  const lowStockCount = ingredients.filter(ingredient => ingredient.stockQuantity <= ingredient.minimumStock).length;
  const criticalStockCount = ingredients.filter(ingredient => ingredient.stockQuantity <= ingredient.averageDailyUsage).length;
  const badges = new Set<string>();

  if (orders.length > 0) {
    badges.add("Premier reapprovisionnement");
  }
  if (lowStockCount === 0 && ingredients.length > 0) {
    badges.add("Stock maitrise");
  }
  if (criticalStockCount === 0 && ingredients.length > 0) {
    badges.add("Zero rupture");
  }
  if (paidOrders.some(order => (order.totalInclTax || order.totalAmount) <= 1200)) {
    badges.add("Budget respecte");
  }
  if (orders.some(order => order.items.some(item => item.recommendedQuantity > 0))) {
    badges.add("Prevision 7 jours utilisee");
  }

  const normalizedScore = Math.max(0, score + badges.size * 25);
  const level = normalizedScore >= 280
    ? "Manager expert"
    : normalizedScore >= 180
      ? "Approvisionnement optimise"
      : normalizedScore >= 90
        ? "Gestion maitrisee"
        : "Gestion debutante";

  res.json({
    score: normalizedScore,
    level,
    levelProgress: Math.min(100, normalizedScore % 100),
    badges: [...badges],
    tips: [
      lowStockCount > 0
        ? `${lowStockCount} ingredient(s) sous le seuil: ajoute les quantites recommandees au panier.`
        : "Les seuils de stock sont bien couverts.",
      orders.length === 0
        ? "Valide une premiere commande fournisseur pour debloquer les badges achats."
        : "Continue a rapprocher les quantites commandees des besoins previsionnels."
    ],
    lowStockCount,
    paidOrderCount: paidOrders.length
  });
});

purchaseOrderRouter.get("/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const order = await PurchaseOrderModel.findOne(buildAccountScope(user, { _id: req.params.id }))
    .populate(orderPopulate)
    .exec();

  if (!order) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }

  res.json(order);
});

purchaseOrderRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createPurchaseOrderBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as CreatePurchaseOrderInput;
    const supplier = await SupplierModel.findOne(buildAccountScope(user, { _id: payload.supplier })).exec();
    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    const items = await normalizeOrderItems(user, payload.items);
    if (!items) {
      res.status(404).json({ error: "One or more ingredients were not found" });
      return;
    }

    const financials = await buildOrderFinancials(user, payload.supplier, items, payload.vatRate);
    const status: PurchaseOrderStatus = payload.status === "validated" ? "pending_payment" : payload.status;
    const order = await PurchaseOrderModel.create({
      orderNumber: buildOrderNumber(),
      supplier: payload.supplier,
      suppliers: financials.supplierIds.map(id => new Types.ObjectId(id)),
      owner: user._id,
      status,
      requestedDeliveryDate: payload.requestedDeliveryDate,
      estimatedDeliveryDate: computeEstimatedDeliveryDate(
        payload.requestedDeliveryDate,
        payload.estimatedDeliveryDate,
        financials.leadTimeDays || supplier.deliveryLeadTimeDays
      ),
      deliveryAddress: payload.deliveryAddress || DEFAULT_DELIVERY_ADDRESS,
      internalComment: payload.internalComment,
      notes: payload.notes,
      items,
      deliveryFee: financials.totals.deliveryFee,
      vatRate: payload.vatRate,
      totalExclTax: financials.totals.totalExclTax,
      vatAmount: financials.totals.vatAmount,
      totalInclTax: financials.totals.totalInclTax,
      totalAmount: financials.totals.totalAmount,
      validatedAt: status === "pending_payment" ? new Date() : null,
      managementScoreDelta: financials.score.score,
      badges: financials.score.badges
    });

    const populatedOrder = await order.populate(orderPopulate);

    res.status(201).json(populatedOrder);
  }
);

purchaseOrderRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updatePurchaseOrderBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as Partial<CreatePurchaseOrderInput>;
    const patch: Record<string, unknown> = {
      ...payload
    };

    if (payload.supplier) {
      const supplier = await SupplierModel.findOne(buildAccountScope(user, { _id: payload.supplier })).exec();
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
    }

    if (payload.items) {
      const existingOrder = await PurchaseOrderModel.findOne(buildAccountScope(user, { _id: req.params.id })).exec();
      if (!existingOrder) {
        res.status(404).json({ error: "Purchase order not found" });
        return;
      }

      const supplierId = payload.supplier ?? String(existingOrder.supplier);
      const items = await normalizeOrderItems(user, payload.items);
      if (!items) {
        res.status(404).json({ error: "One or more ingredients were not found" });
        return;
      }

      const financials = await buildOrderFinancials(user, supplierId, items, payload.vatRate ?? existingOrder.vatRate ?? 0.1);
      patch.items = items;
      patch.suppliers = financials.supplierIds.map(id => new Types.ObjectId(id));
      patch.deliveryFee = financials.totals.deliveryFee;
      patch.totalExclTax = financials.totals.totalExclTax;
      patch.vatAmount = financials.totals.vatAmount;
      patch.totalInclTax = financials.totals.totalInclTax;
      patch.totalAmount = financials.totals.totalAmount;
      patch.managementScoreDelta = financials.score.score;
      patch.badges = financials.score.badges;
    }

    const order = await PurchaseOrderModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...patch,
        ...getOwnerPatch(user)
      },
      { new: true }
    )
      .populate(orderPopulate)
      .exec();

    if (!order) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    res.json(order);
  }
);

purchaseOrderRouter.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updatePurchaseOrderStatusBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as UpdatePurchaseOrderStatusInput;
    const patch: Record<string, unknown> = {
      status: payload.status
    };

    if (payload.status === "validated" || payload.status === "pending_payment") {
      patch.validatedAt = new Date();
      patch.status = "pending_payment";
    }

    if (payload.status === "paid") {
      patch.paidAt = new Date();
    }

    const order = await PurchaseOrderModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...patch,
        ...getOwnerPatch(user)
      },
      { new: true }
    )
      .populate(orderPopulate)
      .exec();

    if (!order) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    res.json(order);
  }
);

purchaseOrderRouter.post(
  "/:id/payments/fake",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: fakePaymentBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as FakePaymentInput;
    if (payload.method === "fake_card") {
      const missingFields = [
        ["holderName", payload.holderName],
        ["cardNumber", payload.cardNumber],
        ["expirationDate", payload.expirationDate],
        ["cvv", payload.cvv],
        ["billingAddress", payload.billingAddress]
      ].filter(([, value]) => !String(value || "").trim());

      if (missingFields.length > 0) {
        res.status(400).json({
          error: "Fake payment validation failed",
          missingFields: missingFields.map(([field]) => field)
        });
        return;
      }
    }

    const order = await PurchaseOrderModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        status: "paid",
        paymentMethod: payload.method,
        paidAt: new Date(),
        ...getOwnerPatch(user)
      },
      { new: true }
    )
      .populate(orderPopulate)
      .exec();

    if (!order) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    res.json(order);
  }
);

purchaseOrderRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const deleted = await PurchaseOrderModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();

    if (!deleted) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    res.status(204).send();
  }
);

export { purchaseOrderRouter };
