import { ChargeModel, DishModel, IDish, ISale, SaleModel, IngredientModel } from "../models";
import { buildIngredientNeeds } from "./purchasePlanningService";
import { listDishProfitability, normalizeChargeToDaily } from "./profitabilityService";
import { startOfDay, subDays } from "./serviceUtils";
import { ForecastConfidence, SalesTrend } from "../types/business";

type DailyPoint = {
  day: string;
  quantity: number;
};

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyTrend(recommended: number, baseline: number): SalesTrend {
  if (recommended > baseline * 1.15) return "up";
  if (recommended < baseline * 0.85) return "down";
  return "steady";
}

function classifyConfidence(historyCount: number): ForecastConfidence {
  if (historyCount >= 12) return "high";
  if (historyCount >= 5) return "medium";
  return "low";
}

function extractDishDailySeries(sales: ISale[], dishId: string) {
  const series = new Map<string, number>();

  for (const sale of sales) {
    const day = toIsoDay(new Date(sale.serviceDate));
    let total = series.get(day) ?? 0;
    for (const item of sale.items) {
      if (String(item.dish) === dishId) {
        total += item.quantity;
      }
    }
    if (total > 0) {
      series.set(day, total);
    }
  }

  return [...series.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, quantity]) => ({ day, quantity }));
}

function buildDishForecast(targetDate: Date, dish: IDish, series: DailyPoint[]) {
  const targetWeekday = targetDate.getDay();
  const sameWeekday = series.filter((point) => new Date(point.day).getDay() === targetWeekday).slice(-4);
  const recent7 = series.slice(-7);
  const recent21 = series.slice(-21);

  const weekdayAverage = average(sameWeekday.map((point) => point.quantity));
  const recentAverage = average(recent7.map((point) => point.quantity));
  const longAverage = average(recent21.map((point) => point.quantity));

  const baseDemand = series.length === 0
    ? dish.estimatedDailyServings * 0.75
    : (weekdayAverage * 0.55) + (recentAverage * 0.3) + (longAverage * 0.15);

  const recommendedQuantity = Math.max(0, Math.round(baseDemand));
  const trend = classifyTrend(recommendedQuantity, Math.max(dish.estimatedDailyServings, 1));
  const confidence = classifyConfidence(series.length);

  return {
    dishId: String(dish._id),
    dishName: dish.name,
    category: dish.category,
    recommendedQuantity,
    baselineQuantity: dish.estimatedDailyServings,
    trend,
    confidence,
    historyDaysUsed: series.length,
    weekdayAverage: Math.round(weekdayAverage * 100) / 100,
    recentAverage: Math.round(recentAverage * 100) / 100,
    longAverage: Math.round(longAverage * 100) / 100
  };
}

export async function buildDailyForecast(targetDateInput?: string) {
  const targetDate = startOfDay(targetDateInput ? new Date(targetDateInput) : new Date());
  const historyStart = subDays(targetDate, 42);

  const [dishes, sales, charges, ingredients] = await Promise.all([
    DishModel.find({ active: true }).exec(),
    SaleModel.find({ serviceDate: { $gte: historyStart, $lt: targetDate } }).exec(),
    ChargeModel.find({ active: true }).exec(),
    IngredientModel.find({ active: true }).exec()
  ]);

  const ingredientMap = new Map(ingredients.map((ingredient) => [String(ingredient._id), ingredient]));
  const profitability = await listDishProfitability(dishes);
  const profitabilityMap = new Map(profitability.map((item) => [item.dishId, item]));

  const totalEstimatedDailyServings = Math.max(
    dishes.reduce((sum, dish) => sum + Math.max(dish.estimatedDailyServings || 0, 0), 0),
    1
  );
  const chargePerServing = charges.reduce((sum, charge) => sum + normalizeChargeToDaily(charge), 0) / totalEstimatedDailyServings;

  const dishForecasts = dishes.map((dish) => {
    const series = extractDishDailySeries(sales, String(dish._id));
    const forecast = buildDishForecast(targetDate, dish, series);
    const pricing = profitabilityMap.get(String(dish._id));
    const projectedRevenue = (pricing?.suggestedPrice ?? 0) * forecast.recommendedQuantity;

    return {
      ...forecast,
      suggestedPrice: pricing?.suggestedPrice ?? 0,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      projectedFoodCost: Math.round((pricing?.foodCost ?? 0) * forecast.recommendedQuantity * 100) / 100
    };
  });

  const ingredientNeeds = await buildIngredientNeeds(
    dishForecasts.map((forecast) => ({
      dish: dishes.find((dish) => String(dish._id) === forecast.dishId)!,
      quantity: forecast.recommendedQuantity
    })),
    ingredientMap
  );

  const totalProjectedRevenue = Math.round(
    dishForecasts.reduce((sum, forecast) => sum + forecast.projectedRevenue, 0) * 100
  ) / 100;

  return {
    targetDate: toIsoDay(targetDate),
    dishes: dishForecasts,
    ingredientNeeds,
    totals: {
      totalProjectedRevenue,
      totalProjectedPlates: dishForecasts.reduce((sum, forecast) => sum + forecast.recommendedQuantity, 0),
      chargePerServing: Math.round(chargePerServing * 100) / 100
    },
    alerts: dishForecasts
      .filter((forecast) => forecast.recommendedQuantity > forecast.baselineQuantity * 1.3 || forecast.recommendedQuantity < forecast.baselineQuantity * 0.5)
      .map((forecast) => ({
        dishId: forecast.dishId,
        dishName: forecast.dishName,
        message: forecast.recommendedQuantity > forecast.baselineQuantity * 1.3
          ? "Risque de sous-production si le service est fort."
          : "Risque de surproduction si tu cuisines comme un jour standard."
      }))
  };
}
