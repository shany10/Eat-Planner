import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createIngredientBody, CreateIngredientInput, updateIngredientBody, UpdateIngredientInput } from "../schemas";
import { DishModel, IngredientModel, SupplierModel } from "../models";

const ingredientRouter = Router();

ingredientRouter.get("/", authMiddleware, async (_req, res): Promise<void> => {
  const ingredients = await IngredientModel.find()
    .populate("supplier", "name")
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
    const payload = req.body as CreateIngredientInput;

    if (payload.supplier) {
      const supplier = await SupplierModel.findById(payload.supplier).exec();
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
    }

    const ingredient = await IngredientModel.create(payload);
    res.status(201).json(ingredient);
  }
);

ingredientRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateIngredientBody }),
  async (req, res): Promise<void> => {
    const payload = req.body as UpdateIngredientInput;

    if (payload.supplier) {
      const supplier = await SupplierModel.findById(payload.supplier).exec();
      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
    }

    const ingredient = await IngredientModel.findByIdAndUpdate(req.params.id, payload, {
      new: true
    }).exec();

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
    const usedByDish = await DishModel.findOne({ "ingredients.ingredient": req.params.id }).exec();
    if (usedByDish) {
      res.status(409).json({ error: "Ingredient is still used by a dish" });
      return;
    }

    const deleted = await IngredientModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Ingredient not found" });
      return;
    }

    res.status(204).send();
  }
);

export { ingredientRouter };
