import { ChargeModel, DishModel, ICharge, IDish, IIngredient, IngredientModel, IUser, UserModel } from "../models";
import { buildAccountScope } from "./accountScopeService";
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
  targetMarginRate: number | null;
  effectiveMarginRate: number;
  marginSource: "dish" | "account" | "system";
  vatRate: number;
  foodCost: number;
  chargeCost: number;
  totalCost: number;
  suggestedPriceExcludingTax: number;
  suggestedVatAmount: number;
  suggestedPriceIncludingTax: number;
  actualPriceExcludingTax: number;
  actualVatAmount: number;
  actualPriceIncludingTax: number;
  priceGapIncludingTax: number;
  priceGapRate: number;
  expectedMarginAmount: number;
  suggestedPrice: number;
  expectedGrossProfit: number;
  lines: CostBreakdownLine[];
};

type PricingSettings = {
  defaultMarginRate: number;
  vatRate: number;
};

type ResolvedPricingSettings = {
  targetMarginRate: number;
  marginSource: DishProfitabilitySnapshot["marginSource"];
  vatRate: number;
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

function roundRate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function clampRate(value: number, min = 0, max = 0.95) {
  return Math.min(Math.max(value, min), max);
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

async function loadProfitabilityContext(dishes: IDish[], currentUser?: IUser | null) {
  const ingredientIds = [...new Set(
    dishes.flatMap((dish) => dish.ingredients.map((line) => String(line.ingredient)))
  )];
  const ownerIds = [...new Set(
    dishes
      .map((dish) => dish.owner ? String(dish.owner) : currentUser ? String(currentUser._id) : null)
      .filter((id): id is string => Boolean(id))
  )];

  const [ingredients, charges, activeDishes, owners] = await Promise.all([
    IngredientModel.find(currentUser ? buildAccountScope(currentUser, { _id: { $in: ingredientIds } }) : { _id: { $in: ingredientIds } }).exec(),
    ChargeModel.find(currentUser ? buildAccountScope(currentUser, { active: true }) : { active: true }).exec(),
    DishModel.find(currentUser ? buildAccountScope(currentUser, { active: true }) : { active: true }, "estimatedDailyServings").exec(),
    UserModel.find({ _id: { $in: ownerIds } }, "defaultMarginRate vatRate").exec()
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
  const ownerSettingsMap = new Map<string, PricingSettings>();
  for (const owner of owners) {
    ownerSettingsMap.set(String(owner._id), {
      defaultMarginRate: owner.defaultMarginRate,
      vatRate: owner.vatRate
    });
  }

  return {
    ingredientMap,
    chargePerServing: dailyCharges / totalEstimatedDailyServings,
    ownerSettingsMap
  };
}

function resolvePricingSettings(
  dish: IDish,
  currentUser?: IUser | null,
  ownerSettingsMap?: Map<string, PricingSettings>
): ResolvedPricingSettings {
  const ownerId = dish.owner ? String(dish.owner) : currentUser ? String(currentUser._id) : "";
  const ownerSettings = ownerId ? ownerSettingsMap?.get(ownerId) : null;
  const accountMargin = ownerSettings?.defaultMarginRate ?? currentUser?.defaultMarginRate;
  const accountVatRate = ownerSettings?.vatRate ?? currentUser?.vatRate;

  const marginSource: DishProfitabilitySnapshot["marginSource"] = typeof dish.targetMarginRate === "number" ? "dish" : accountMargin !== undefined ? "account" : "system";
  const targetMarginRate = clampRate(
    typeof dish.targetMarginRate === "number"
      ? dish.targetMarginRate
      : accountMargin ?? 0.72
  );
  const vatRate = clampRate(accountVatRate ?? 0.1, 0, 1);

  return {
    marginSource,
    targetMarginRate,
    vatRate
  };
}

export function buildDishProfitabilitySnapshot(
  dish: IDish,
  ingredientMap: Map<string, IIngredient>,
  chargePerServing: number,
  pricingSettings = resolvePricingSettings(dish)
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
  const targetMarginRate = typeof dish.targetMarginRate === "number" ? roundRate(dish.targetMarginRate) : null;
  const effectiveMarginRate = pricingSettings.targetMarginRate;
  const vatRate = pricingSettings.vatRate;
  const safeDenominator = Math.max(1 - effectiveMarginRate, 0.05);
  const suggestedPriceExcludingTax = roundCurrency(totalCost / safeDenominator);
  const suggestedVatAmount = roundCurrency(suggestedPriceExcludingTax * vatRate);
  const suggestedPriceIncludingTax = roundCurrency(suggestedPriceExcludingTax + suggestedVatAmount);
  const actualPriceIncludingTax = roundCurrency(dish.actualPriceIncludingTax || 0);
  const actualPriceExcludingTax = actualPriceIncludingTax > 0
    ? roundCurrency(actualPriceIncludingTax / (1 + vatRate))
    : 0;
  const actualVatAmount = actualPriceIncludingTax > 0
    ? roundCurrency(actualPriceIncludingTax - actualPriceExcludingTax)
    : 0;
  const priceGapIncludingTax = actualPriceIncludingTax > 0
    ? roundCurrency(actualPriceIncludingTax - suggestedPriceIncludingTax)
    : 0;
  const priceGapRate = suggestedPriceIncludingTax > 0 && actualPriceIncludingTax > 0
    ? roundRate(priceGapIncludingTax / suggestedPriceIncludingTax)
    : 0;
  const expectedMarginAmount = roundCurrency(suggestedPriceExcludingTax - totalCost);
  const expectedGrossProfit = actualPriceIncludingTax > 0
    ? roundCurrency(actualPriceExcludingTax - totalCost)
    : expectedMarginAmount;

  return {
    dishId: String(dish._id),
    name: dish.name,
    category: dish.category,
    estimatedDailyServings: dish.estimatedDailyServings,
    targetMarginRate,
    effectiveMarginRate,
    marginSource: pricingSettings.marginSource,
    vatRate,
    foodCost: roundCurrency(foodCost),
    chargeCost,
    totalCost,
    suggestedPriceExcludingTax,
    suggestedVatAmount,
    suggestedPriceIncludingTax,
    actualPriceExcludingTax,
    actualVatAmount,
    actualPriceIncludingTax,
    priceGapIncludingTax,
    priceGapRate,
    expectedMarginAmount,
    suggestedPrice: suggestedPriceIncludingTax,
    expectedGrossProfit,
    lines
  };
}

export async function listDishProfitability(dishes: IDish[], currentUser?: IUser | null) {
  const { ingredientMap, chargePerServing, ownerSettingsMap } = await loadProfitabilityContext(dishes, currentUser);
  return dishes.map((dish) => buildDishProfitabilitySnapshot(
    dish,
    ingredientMap,
    chargePerServing,
    resolvePricingSettings(dish, currentUser, ownerSettingsMap)
  ));
}

export async function buildDishProfitabilityById(dish: IDish, currentUser?: IUser | null) {
  const [snapshot] = await listDishProfitability([dish], currentUser);
  return snapshot;
}
