import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createIngredientBody, CreateIngredientInput, updateIngredientBody, UpdateIngredientInput } from "../schemas";
import { DishModel, IngredientModel, SupplierModel } from "../models";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";

const ingredientRouter = Router();

ingredientRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ingredients = await IngredientModel.find(buildAccountScope(user))
    .populate("supplier", "name productTypes deliveryLeadTimeDays deliveryFee minimumOrderAmount email phone address active")
    .sort({ name: 1 })
    .exec();

  res.json(ingredients);
});

ingredientRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createIngredientBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as CreateIngredientInput;

    if (payload.supplier) {
      const supplier = await SupplierModel.findOne(
        buildAccountScope(user, { _id: payload.supplier })
      ).exec();
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
    }

    const ingredient = await IngredientModel.create({
      ...payload,
      orderUnit: payload.orderUnit ?? payload.unit,
      owner: user._id
    });
    res.status(201).json(ingredient);
  }
);

ingredientRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateIngredientBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as UpdateIngredientInput;

    if (payload.supplier) {
      const supplier = await SupplierModel.findOne(
        buildAccountScope(user, { _id: payload.supplier })
      ).exec();
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
    }

    const ingredient = await IngredientModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...payload,
        ...(payload.unit && !payload.orderUnit ? { orderUnit: payload.unit } : {}),
        ...getOwnerPatch(user)
      },
      { new: true }
    ).exec();

    if (!ingredient) {
      res.status(404).json({ error: "Ingredient not found" });
      return;
    }

    res.json(ingredient);
  }
);

ingredientRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const usedByDish = await DishModel.findOne(
      buildAccountScope(user, { "ingredients.ingredient": req.params.id })
    ).exec();
    if (usedByDish) {
      res.status(409).json({ error: "Ingredient is still used by a dish" });
      return;
    }

    const deleted = await IngredientModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();
    if (!deleted) {
      res.status(404).json({ error: "Ingredient not found" });
      return;
    }

    res.status(204).send();
  }
);

export { ingredientRouter };
