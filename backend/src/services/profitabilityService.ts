import { ChargeModel, DishModel, ICharge, IDish, IIngredient, IngredientModel } from "../models";
import { BusinessUnit } from "../types/business";

type CostBreakdownLine = {
  ingredientId: string;
  ingredientName: string;
  recipeQuantity: number;
  recipeUnit: BusinessUnit;
  purchaseUnit: BusinessUnit;
  unitCost: number;
  lineCost: number;
};

type DishProfitabilitySnapshot = {
  dishId: string;
  name: string;
  category: string;
  estimatedDailyServings: number;
  targetMarginRate: number;
  foodCost: number;
  chargeCost: number;
  totalCost: number;
  suggestedPrice: number;
  expectedGrossProfit: number;
  lines: CostBreakdownLine[];
};

const MASS_TO_GRAMS: Record<"g" | "kg", number> = {
  g: 1,
  kg: 1000
};

const VOLUME_TO_ML: Record<"ml" | "cl" | "l", number> = {
  ml: 1,
  cl: 10,
  l: 1000
};

function isMassUnit(unit: BusinessUnit): unit is "g" | "kg" {
  return unit === "g" || unit === "kg";
}

function isVolumeUnit(unit: BusinessUnit): unit is "ml" | "cl" | "l" {
  return unit === "ml" || unit === "cl" || unit === "l";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertQuantity(quantity: number, from: BusinessUnit, to: BusinessUnit): number {
  if (from === to) return quantity;

  if (isMassUnit(from) && isMassUnit(to)) {
    return (quantity * MASS_TO_GRAMS[from]) / MASS_TO_GRAMS[to];
  }

  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    return (quantity * VOLUME_TO_ML[from]) / VOLUME_TO_ML[to];
  }

  if (from === "piece" && to === "piece") {
    return quantity;
  }

  throw new Error(`Incompatible unit conversion from ${from} to ${to}`);
}

export function normalizeChargeToDaily(charge: ICharge) {
  if (charge.period === "daily") return charge.amount;
  return charge.amount / 30;
}

async function loadProfitabilityContext(dishes: IDish[]) {
  const ingredientIds = [...new Set(
    dishes.flatMap((dish) => dish.ingredients.map((line) => String(line.ingredient)))
  )];

  const [ingredients, charges, activeDishes] = await Promise.all([
    IngredientModel.find({ _id: { $in: ingredientIds } }).exec(),
    ChargeModel.find({ active: true }).exec(),
    DishModel.find({ active: true }, "estimatedDailyServings").exec()
  ]);

  const ingredientMap = new Map<string, IIngredient>();
  for (const ingredient of ingredients) {
    ingredientMap.set(String(ingredient._id), ingredient);
  }

  const totalEstimatedDailyServings = Math.max(
    activeDishes.reduce((sum, dish) => sum + Math.max(dish.estimatedDailyServings || 0, 0), 0),
    1
  );

  const dailyCharges = charges.reduce((sum, charge) => sum + normalizeChargeToDaily(charge), 0);

  return {
    ingredientMap,
    chargePerServing: dailyCharges / totalEstimatedDailyServings
  };
}

export function buildDishProfitabilitySnapshot(
  dish: IDish,
  ingredientMap: Map<string, IIngredient>,
  chargePerServing: number
): DishProfitabilitySnapshot {
  const lines: CostBreakdownLine[] = [];
  let foodCost = 0;

  for (const line of dish.ingredients) {
    const ingredient = ingredientMap.get(String(line.ingredient));
    if (!ingredient) continue;

    const convertedQuantity = convertQuantity(line.quantity, line.unit, ingredient.unit);
    const lineCost = convertedQuantity * ingredient.purchasePrice;
    foodCost += lineCost;

    lines.push({
      ingredientId: String(ingredient._id),
      ingredientName: ingredient.name,
      recipeQuantity: line.quantity,
      recipeUnit: line.unit,
      purchaseUnit: ingredient.unit,
      unitCost: roundCurrency(ingredient.purchasePrice),
      lineCost: roundCurrency(lineCost)
    });
  }

  const chargeCost = roundCurrency(chargePerServing);
  const totalCost = roundCurrency(foodCost + chargeCost);
  const targetMarginRate = Math.min(Math.max(dish.targetMarginRate, 0), 0.95);
  const safeDenominator = Math.max(1 - targetMarginRate, 0.05);
  const suggestedPrice = roundCurrency(totalCost / safeDenominator);
  const expectedGrossProfit = roundCurrency(suggestedPrice - totalCost);

  return {
    dishId: String(dish._id),
    name: dish.name,
    category: dish.category,
    estimatedDailyServings: dish.estimatedDailyServings,
    targetMarginRate,
    foodCost: roundCurrency(foodCost),
    chargeCost,
    totalCost,
    suggestedPrice,
    expectedGrossProfit,
    lines
  };
}

export async function listDishProfitability(dishes: IDish[]) {
  const { ingredientMap, chargePerServing } = await loadProfitabilityContext(dishes);
  return dishes.map((dish) => buildDishProfitabilitySnapshot(dish, ingredientMap, chargePerServing));
}

export async function buildDishProfitabilityById(dish: IDish) {
  const [snapshot] = await listDishProfitability([dish]);
  return snapshot;
}
