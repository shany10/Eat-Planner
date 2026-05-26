import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createDishBody, CreateDishInput, updateDishBody, UpdateDishInput } from "../schemas";
import { DishModel, IngredientModel, SaleModel } from "../models";
import { buildDishProfitabilityById, listDishProfitability } from "../services/profitabilityService";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";

const dishRouter = Router();

async function ensureIngredientsExist(ingredientIds: string[], user: Awaited<ReturnType<typeof loadRequestUser>>) {
  if (!user) return false;

  const uniqueIds = [...new Set(ingredientIds)];
  const existing = await IngredientModel.find(
    buildAccountScope(user, { _id: { $in: uniqueIds } })
  ).exec();

  return existing.length === uniqueIds.length;
}

dishRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const dishes = await DishModel.find(buildAccountScope(user)).sort({ name: 1 }).exec();
  const profitability = await listDishProfitability(dishes, user);

  res.json(dishes.map((dish) => {
    const metrics = profitability.find((item) => item.dishId === String(dish._id));
    return {
      ...dish.toJSON(),
      profitability: metrics
    };
  }));
});

dishRouter.get("/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const dish = await DishModel.findOne(buildAccountScope(user, { _id: req.params.id })).exec();
  if (!dish) {
    res.status(404).json({ error: "Dish not found" });
    return;
  }

  const profitability = await buildDishProfitabilityById(dish, user);
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
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as CreateDishInput;
    const ingredientsExist = await ensureIngredientsExist(payload.ingredients.map((item) => item.ingredient), user);

    if (!ingredientsExist) {
      res.status(404).json({ error: "One or more ingredients were not found" });
      return;
    }

    const dish = await DishModel.create({
      ...payload,
      owner: user._id
    });
    res.status(201).json(dish);
  }
);

dishRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateDishBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as UpdateDishInput;

    if (payload.ingredients?.length) {
      const ingredientsExist = await ensureIngredientsExist(payload.ingredients.map((item) => item.ingredient), user);
      if (!ingredientsExist) {
        res.status(404).json({ error: "One or more ingredients were not found" });
        return;
      }
    }

    const dish = await DishModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...payload,
        ...getOwnerPatch(user)
      },
      { new: true }
    ).exec();

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
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const sale = await SaleModel.findOne(
      buildAccountScope(user, { "items.dish": req.params.id })
    ).exec();
    if (sale) {
      res.status(409).json({ error: "Dish cannot be deleted because it exists in sales history" });
      return;
    }

    const deleted = await DishModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();
    if (!deleted) {
      res.status(404).json({ error: "Dish not found" });
      return;
    }

    res.status(204).send();
  }
);

export { dishRouter };
