import { ChargeModel, DishModel, ForecastModel, IDish, IForecast, IForecastRecommendation, ISale, SaleModel, IngredientModel, IUser } from "../models";
import { Types } from "mongoose";
import { buildAccountScope } from "./accountScopeService";
import { buildIngredientNeeds } from "./purchasePlanningService";
import { listDishProfitability, normalizeChargeToDaily } from "./profitabilityService";
import { addDays, startOfDay, subDays } from "./serviceUtils";
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

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
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

function buildActualSalesMap(sales: ISale[]) {
  const actuals = new Map<string, { quantity: number; revenue: number }>();

  for (const sale of sales) {
    for (const item of sale.items) {
      const dishId = String(item.dish);
      const current = actuals.get(dishId) ?? { quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.quantity * item.unitPrice;
      actuals.set(dishId, current);
    }
  }

  return actuals;
}

async function loadTargetSales(targetDate: Date, currentUser?: IUser | null) {
  return SaleModel.find(currentUser
    ? buildAccountScope(currentUser, { serviceDate: { $gte: targetDate, $lt: addDays(targetDate, 1) } })
    : { serviceDate: { $gte: targetDate, $lt: addDays(targetDate, 1) } }
  ).exec();
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

export async function buildDailyForecast(targetDateInput?: string, currentUser?: IUser | null) {
  const targetDate = startOfDay(targetDateInput ? new Date(targetDateInput) : new Date());
  const historyStart = subDays(targetDate, 42);

  const [dishes, sales, targetSales, charges, ingredients] = await Promise.all([
    DishModel.find(currentUser ? buildAccountScope(currentUser, { active: true }) : { active: true }).exec(),
    SaleModel.find(currentUser
      ? buildAccountScope(currentUser, { serviceDate: { $gte: historyStart, $lt: targetDate } })
      : { serviceDate: { $gte: historyStart, $lt: targetDate } }
    ).exec(),
    loadTargetSales(targetDate, currentUser),
    ChargeModel.find(currentUser ? buildAccountScope(currentUser, { active: true }) : { active: true }).exec(),
    IngredientModel.find(currentUser ? buildAccountScope(currentUser, { active: true }) : { active: true }).exec()
  ]);

  const ingredientMap = new Map(ingredients.map((ingredient) => [String(ingredient._id), ingredient]));
  const actualsMap = buildActualSalesMap(targetSales);
  const profitability = await listDishProfitability(dishes, currentUser);
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
    const projectedRevenue = (pricing?.actualPriceIncludingTax || pricing?.suggestedPriceIncludingTax || 0) * forecast.recommendedQuantity;
    const actual = actualsMap.get(String(dish._id)) ?? { quantity: 0, revenue: 0 };

    return {
      ...forecast,
      initialForecastQuantity: forecast.recommendedQuantity,
      suggestedPrice: pricing?.suggestedPriceIncludingTax ?? pricing?.suggestedPrice ?? 0,
      suggestedPriceIncludingTax: pricing?.suggestedPriceIncludingTax ?? 0,
      actualPriceIncludingTax: pricing?.actualPriceIncludingTax ?? 0,
      comment: buildForecastComment(forecast.historyDaysUsed, forecast.confidence),
      userCorrectionQuantity: null,
      correctionComment: "",
      correctedAt: null,
      correctedBy: null,
      actualQuantitySold: actual.quantity,
      actualRevenue: roundCurrency(actual.revenue),
      productionGap: actual.quantity - forecast.recommendedQuantity,
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
    persisted: false,
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

function buildForecastComment(historyDaysUsed: number, confidence: ForecastConfidence) {
  if (historyDaysUsed === 0) {
    return "Premiere estimation basee sur les portions journalieres prevues pour le plat.";
  }

  if (confidence === "high") {
    return "Prevision basee sur un historique suffisant et les tendances recentes.";
  }

  return "Prevision a surveiller : l historique reste encore limite.";
}

function getEffectiveUnitPrice(recommendation: Pick<IForecastRecommendation, "actualPriceIncludingTax" | "suggestedPriceIncludingTax" | "suggestedPrice">) {
  return recommendation.actualPriceIncludingTax > 0
    ? recommendation.actualPriceIncludingTax
    : recommendation.suggestedPriceIncludingTax || recommendation.suggestedPrice || 0;
}

function toObjectId(value: unknown) {
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(String(value));
}

async function rebuildStoredForecastParts(
  targetDate: Date,
  recommendations: IForecastRecommendation[],
  currentUser: IUser
) {
  const dishIds = recommendations.map((recommendation) => String(recommendation.dish));
  const [dishes, charges, ingredients] = await Promise.all([
    DishModel.find(buildAccountScope(currentUser, { _id: { $in: dishIds } })).exec(),
    ChargeModel.find(buildAccountScope(currentUser, { active: true })).exec(),
    IngredientModel.find(buildAccountScope(currentUser, { active: true })).exec()
  ]);

  const dishMap = new Map(dishes.map((dish) => [String(dish._id), dish]));
  const ingredientMap = new Map(ingredients.map((ingredient) => [String(ingredient._id), ingredient]));
  const plans: Array<{ dish: IDish; quantity: number }> = [];
  for (const recommendation of recommendations) {
    const dish = dishMap.get(String(recommendation.dish));
    if (dish) {
      plans.push({ dish, quantity: recommendation.recommendedQuantity });
    }
  }

  const ingredientNeeds = (await buildIngredientNeeds(plans, ingredientMap)).map((need) => ({
    ...need,
    ingredientId: toObjectId(need.ingredientId)
  }));

  for (const recommendation of recommendations) {
    const unitPrice = getEffectiveUnitPrice(recommendation);
    const initialQuantity = Math.max(recommendation.initialForecastQuantity || recommendation.recommendedQuantity, 1);
    const unitFoodCost = recommendation.projectedFoodCost / initialQuantity;
    recommendation.projectedRevenue = roundCurrency(unitPrice * recommendation.recommendedQuantity);
    recommendation.projectedFoodCost = roundCurrency(unitFoodCost * recommendation.recommendedQuantity);
  }

  const activeServings = Math.max(
    dishes.reduce((sum, dish) => sum + Math.max(dish.estimatedDailyServings || 0, 0), 0),
    1
  );
  const chargePerServing = charges.reduce((sum, charge) => sum + normalizeChargeToDaily(charge), 0) / activeServings;

  return {
    ingredientNeeds,
    totals: {
      totalProjectedRevenue: roundCurrency(recommendations.reduce((sum, recommendation) => sum + recommendation.projectedRevenue, 0)),
      totalProjectedPlates: recommendations.reduce((sum, recommendation) => sum + recommendation.recommendedQuantity, 0),
      chargePerServing: roundCurrency(chargePerServing)
    },
    alerts: recommendations
      .filter((recommendation) => recommendation.recommendedQuantity > recommendation.baselineQuantity * 1.3 || recommendation.recommendedQuantity < recommendation.baselineQuantity * 0.5)
      .map((recommendation) => ({
        dishId: recommendation.dish,
        dishName: recommendation.dishName,
        message: recommendation.recommendedQuantity > recommendation.baselineQuantity * 1.3
          ? "Risque de sous-production si le service est fort."
          : "Risque de surproduction si tu cuisines comme un jour standard."
      }))
  };
}

async function serializeStoredForecast(forecast: IForecast, currentUser: IUser) {
  const actualsMap = buildActualSalesMap(await loadTargetSales(startOfDay(forecast.targetDate), currentUser));

  return {
    _id: String(forecast._id),
    persisted: true,
    targetDate: toIsoDay(startOfDay(forecast.targetDate)),
    generatedAt: forecast.created_at,
    updatedAt: forecast.updated_at,
    dishes: forecast.dishes.map((recommendation) => {
      const dishId = String(recommendation.dish);
      const actual = actualsMap.get(dishId) ?? { quantity: 0, revenue: 0 };

      return {
        dishId,
        dishName: recommendation.dishName,
        category: recommendation.category,
        initialForecastQuantity: recommendation.initialForecastQuantity,
        recommendedQuantity: recommendation.recommendedQuantity,
        baselineQuantity: recommendation.baselineQuantity,
        trend: recommendation.trend,
        confidence: recommendation.confidence,
        historyDaysUsed: recommendation.historyDaysUsed,
        weekdayAverage: recommendation.weekdayAverage,
        recentAverage: recommendation.recentAverage,
        longAverage: recommendation.longAverage,
        suggestedPrice: recommendation.suggestedPrice,
        suggestedPriceIncludingTax: recommendation.suggestedPriceIncludingTax,
        actualPriceIncludingTax: recommendation.actualPriceIncludingTax,
        projectedRevenue: recommendation.projectedRevenue,
        projectedFoodCost: recommendation.projectedFoodCost,
        comment: recommendation.comment,
        userCorrectionQuantity: recommendation.userCorrectionQuantity ?? null,
        correctionComment: recommendation.correctionComment ?? "",
        correctedAt: recommendation.correctedAt ?? null,
        correctedBy: recommendation.correctedBy ? String(recommendation.correctedBy) : null,
        actualQuantitySold: actual.quantity,
        actualRevenue: roundCurrency(actual.revenue),
        productionGap: actual.quantity - recommendation.recommendedQuantity
      };
    }),
    ingredientNeeds: forecast.ingredientNeeds,
    totals: forecast.totals,
    alerts: forecast.alerts
  };
}

export async function loadSavedDailyForecast(targetDateInput: string | undefined, currentUser: IUser) {
  const targetDate = startOfDay(targetDateInput ? new Date(targetDateInput) : new Date());
  const forecast = await ForecastModel.findOne(
    buildAccountScope(currentUser, { targetDate })
  ).exec();

  return forecast ? serializeStoredForecast(forecast, currentUser) : null;
}

export async function saveDailyForecast(targetDateInput: string | undefined, currentUser: IUser) {
  const targetDate = startOfDay(targetDateInput ? new Date(targetDateInput) : new Date());
  const generated = await buildDailyForecast(toIsoDay(targetDate), currentUser);
  const existing = await ForecastModel.findOne({ owner: currentUser._id, targetDate }).exec();
  const correctionMap = new Map((existing?.dishes ?? []).map((recommendation) => [
    String(recommendation.dish),
    recommendation
  ]));

  const recommendations = generated.dishes.map((dishForecast) => {
    const previous = correctionMap.get(dishForecast.dishId);
    const userCorrectionQuantity = previous?.userCorrectionQuantity ?? null;

    return {
      dish: dishForecast.dishId,
      dishName: dishForecast.dishName,
      category: dishForecast.category,
      initialForecastQuantity: dishForecast.initialForecastQuantity,
      recommendedQuantity: userCorrectionQuantity ?? dishForecast.recommendedQuantity,
      baselineQuantity: dishForecast.baselineQuantity,
      trend: dishForecast.trend,
      confidence: dishForecast.confidence,
      historyDaysUsed: dishForecast.historyDaysUsed,
      weekdayAverage: dishForecast.weekdayAverage,
      recentAverage: dishForecast.recentAverage,
      longAverage: dishForecast.longAverage,
      suggestedPrice: dishForecast.suggestedPrice,
      suggestedPriceIncludingTax: dishForecast.suggestedPriceIncludingTax ?? dishForecast.suggestedPrice,
      actualPriceIncludingTax: dishForecast.actualPriceIncludingTax ?? 0,
      projectedRevenue: dishForecast.projectedRevenue,
      projectedFoodCost: dishForecast.projectedFoodCost,
      comment: dishForecast.comment,
      userCorrectionQuantity,
      correctionComment: previous?.correctionComment ?? "",
      correctedAt: previous?.correctedAt ?? null,
      correctedBy: previous?.correctedBy ?? null
    };
  }).map((recommendation) => ({
    ...recommendation,
    dish: toObjectId(recommendation.dish)
  })) as IForecastRecommendation[];

  const rebuilt = await rebuildStoredForecastParts(targetDate, recommendations, currentUser);
  const forecast = await ForecastModel.findOneAndUpdate(
    { owner: currentUser._id, targetDate },
    {
      targetDate,
      owner: toObjectId(currentUser._id),
      generatedBy: toObjectId(currentUser._id),
      dishes: recommendations,
      ingredientNeeds: rebuilt.ingredientNeeds,
      totals: rebuilt.totals,
      alerts: rebuilt.alerts
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  return serializeStoredForecast(forecast, currentUser);
}

export async function updateForecastCorrection(
  forecastId: string,
  dishId: string,
  correctionQuantity: number,
  correctionComment: string,
  currentUser: IUser
) {
  const forecast = await ForecastModel.findOne(
    buildAccountScope(currentUser, { _id: forecastId })
  ).exec();

  if (!forecast) {
    return null;
  }

  const recommendation = forecast.dishes.find((item) => String(item.dish) === dishId);
  if (!recommendation) {
    return null;
  }

  recommendation.userCorrectionQuantity = correctionQuantity;
  recommendation.recommendedQuantity = correctionQuantity;
  recommendation.correctionComment = correctionComment;
  recommendation.correctedAt = new Date();
  recommendation.correctedBy = toObjectId(currentUser._id);

  const rebuilt = await rebuildStoredForecastParts(startOfDay(forecast.targetDate), forecast.dishes, currentUser);
  forecast.ingredientNeeds = rebuilt.ingredientNeeds;
  forecast.totals = rebuilt.totals;
  forecast.alerts = rebuilt.alerts;
  await forecast.save();

  return serializeStoredForecast(forecast, currentUser);
}
