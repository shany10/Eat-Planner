import { IDish, IIngredient } from "../models";
import { convertQuantity } from "./profitabilityService";

type DishPlanInput = {
  dish: IDish;
  quantity: number;
};

export async function buildIngredientNeeds(
  plans: DishPlanInput[],
  ingredientMap: Map<string, IIngredient>
) {
  const aggregated = new Map<string, {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    quantity: number;
    estimatedCost: number;
  }>();

  for (const plan of plans) {
    for (const line of plan.dish.ingredients) {
      const ingredient = ingredientMap.get(String(line.ingredient));
      if (!ingredient) continue;

      const requiredInPurchaseUnit = convertQuantity(line.quantity, line.unit, ingredient.unit) * plan.quantity;
      const existing = aggregated.get(String(ingredient._id));

      const nextQuantity = (existing?.quantity ?? 0) + requiredInPurchaseUnit;
      const nextCost = (existing?.estimatedCost ?? 0) + requiredInPurchaseUnit * ingredient.purchasePrice;

      aggregated.set(String(ingredient._id), {
        ingredientId: String(ingredient._id),
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        quantity: Math.round(nextQuantity * 100) / 100,
        estimatedCost: Math.round(nextCost * 100) / 100
      });
    }
  }

  return [...aggregated.values()].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}
