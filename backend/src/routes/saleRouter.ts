import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createSaleBody, CreateSaleInput } from "../schemas";
import { DishModel, SaleModel } from "../models";
import { listDishProfitability } from "../services/profitabilityService";

const saleRouter = Router();

saleRouter.get("/", authMiddleware, async (_req, res): Promise<void> => {
  const sales = await SaleModel.find()
    .populate("items.dish", "name category")
    .sort({ serviceDate: -1, created_at: -1 })
    .exec();

  res.json(sales);
});

saleRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createSaleBody }),
  async (req, res): Promise<void> => {
    const payload = req.body as CreateSaleInput;
    const dishIds = [...new Set(payload.items.map((item) => item.dish))];
    const dishes = await DishModel.find({
      _id: { $in: dishIds }
    }).exec();

    if (dishes.length !== dishIds.length) {
      res.status(404).json({ error: "One or more dishes were not found" });
      return;
    }

    const profitability = await listDishProfitability(dishes);
    const priceMap = new Map(profitability.map((item) => [item.dishId, item.suggestedPrice]));

    const items = payload.items.map((item) => ({
      dish: item.dish,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? priceMap.get(item.dish) ?? 0
    }));

    const totalAmount = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 100) / 100;

    const sale = await SaleModel.create({
      serviceDate: new Date(payload.serviceDate),
      notes: payload.notes,
      items,
      totalAmount,
      createdBy: req.user?.id ?? null
    });

    const created = await SaleModel.findById(sale._id).populate("items.dish", "name category").exec();
    res.status(201).json(created);
  }
);

saleRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const deleted = await SaleModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    res.status(204).send();
  }
);

export { saleRouter };
