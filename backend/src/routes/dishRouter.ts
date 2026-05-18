import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createDishBody, CreateDishInput, updateDishBody, UpdateDishInput } from "../schemas";
import { DishModel, IngredientModel, SaleModel } from "../models";
import { buildDishProfitabilityById, listDishProfitability } from "../services/profitabilityService";

const dishRouter = Router();

async function ensureIngredientsExist(ingredientIds: string[]) {
  const uniqueIds = [...new Set(ingredientIds)];
  const existing = await IngredientModel.find({
    _id: { $in: uniqueIds }
  }).exec();

  return existing.length === uniqueIds.length;
}

dishRouter.get("/", authMiddleware, async (_req, res): Promise<void> => {
  const dishes = await DishModel.find().sort({ name: 1 }).exec();
  const profitability = await listDishProfitability(dishes);

  res.json(dishes.map((dish) => {
    const metrics = profitability.find((item) => item.dishId === String(dish._id));
    return {
      ...dish.toJSON(),
      profitability: metrics
    };
  }));
});

dishRouter.get("/:id", authMiddleware, async (req, res): Promise<void> => {
  const dish = await DishModel.findById(req.params.id).exec();
  if (!dish) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }

  const profitability = await buildDishProfitabilityById(dish);
  res.json({
    ...dish.toJSON(),
    profitability
  });
});

dishRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createDishBody }),
  async (req, res): Promise<void> => {
    const payload = req.body as CreateDishInput;
    const ingredientsExist = await ensureIngredientsExist(payload.ingredients.map((item) => item.ingredient));

    if (!ingredientsExist) {
      res.status(404).json({ error: "One or more ingredients were not found" });
      return;
    }

    const dish = await DishModel.create(payload);
    res.status(201).json(dish);
  }
);

dishRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateDishBody }),
  async (req, res): Promise<void> => {
    const payload = req.body as UpdateDishInput;

    if (payload.ingredients?.length) {
      const ingredientsExist = await ensureIngredientsExist(payload.ingredients.map((item) => item.ingredient));
      if (!ingredientsExist) {
        res.status(404).json({ error: "One or more ingredients were not found" });
        return;
      }
    }

    const dish = await DishModel.findByIdAndUpdate(req.params.id, payload, {
      new: true
    }).exec();

    if (!dish) {
      res.status(404).json({ error: "Dish not found" });
      return;
    }

    res.json(dish);
  }
);

dishRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const sale = await SaleModel.findOne({ "items.dish": req.params.id }).exec();
    if (sale) {
      res.status(409).json({ error: "Dish cannot be deleted because it exists in sales history" });
      return;
    }

    const deleted = await DishModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Dish not found" });
      return;
    }

    res.status(204).send();
  }
);

export { dishRouter };
