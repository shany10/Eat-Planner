import { DishModel, IUser, SaleModel } from "../models";
import { buildAccountScope } from "./accountScopeService";
import { listDishProfitability } from "./profitabilityService";

export type PricingAlertType =
  | "missing_price"
  | "selling_at_loss"
  | "low_margin"
  | "star_reprice"
  | "slow_mover";

export type PricingAlertSeverity = "info" | "warning" | "critical";

export type PricingAlert = {
  dishId: string;
  dishName: string;
  category: string;
  type: PricingAlertType;
  severity: PricingAlertSeverity;
  message: string;
  actualPriceIncludingTax: number;
  suggestedPriceIncludingTax: number;
  actualMarginRate: number | null;
  targetMarginRate: number;
  soldQuantity: number;
};

export type PricingAlertsReport = {
  generatedAt: string;
  periodDays: number;
  totalSoldQuantity: number;
  counts: Record<PricingAlertSeverity, number>;
  alerts: PricingAlert[];
};

const PERIOD_DAYS = 30;
// marge sous l'objectif toleree avant de lever une alerte
const MARGIN_TOLERANCE = 0.05;
// volume minimal de ventes sur la periode pour juger la rotation des plats
const MIN_SALES_FOR_ROTATION = 20;

const SEVERITY_ORDER: Record<PricingAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2
};

function roundRate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} EUR`;
}

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)} %`;
}

export async function buildPricingAlertsReport(user: IUser): Promise<PricingAlertsReport> {
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - PERIOD_DAYS);

  const dishes = await DishModel.find(buildAccountScope(user, { active: true })).sort({ name: 1 }).exec();
  const [profitability, sales] = await Promise.all([
    listDishProfitability(dishes, user),
    SaleModel.find(buildAccountScope(user, { serviceDate: { $gte: periodStart } })).exec()
  ]);

  const soldByDish = new Map<string, number>();
  let totalSoldQuantity = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = String(item.dish);
      soldByDish.set(key, (soldByDish.get(key) ?? 0) + item.quantity);
      totalSoldQuantity += item.quantity;
    }
  }

  const topSellerThreshold = Math.max(totalSoldQuantity * 0.1, 5);
  const slowMoverThreshold = Math.max(totalSoldQuantity * 0.02, 1);

  const alerts: PricingAlert[] = [];

  for (const snapshot of profitability) {
    // sans recette le cout matiere est vide : deja couvert par l'alerte "recette incomplete"
    if (!snapshot.lines.length) continue;

    const soldQuantity = soldByDish.get(snapshot.dishId) ?? 0;
    const actualMarginRate = snapshot.actualPriceExcludingTax > 0
      ? roundRate((snapshot.actualPriceExcludingTax - snapshot.totalCost) / snapshot.actualPriceExcludingTax)
      : null;

    const base = {
      dishId: snapshot.dishId,
      dishName: snapshot.name,
      category: snapshot.category,
      actualPriceIncludingTax: snapshot.actualPriceIncludingTax,
      suggestedPriceIncludingTax: snapshot.suggestedPriceIncludingTax,
      actualMarginRate,
      targetMarginRate: snapshot.effectiveMarginRate,
      soldQuantity
    };

    if (snapshot.actualPriceIncludingTax <= 0) {
      alerts.push({
        ...base,
        type: "missing_price",
        severity: "warning",
        message: `Aucun prix de vente saisi. Prix conseille : ${formatPrice(snapshot.suggestedPriceIncludingTax)}.`
      });
      continue;
    }

    if (actualMarginRate !== null && snapshot.actualPriceExcludingTax <= snapshot.totalCost) {
      alerts.push({
        ...base,
        type: "selling_at_loss",
        severity: "critical",
        message: `Vendu a perte : le cout par portion (${formatPrice(snapshot.totalCost)}) depasse le prix HT (${formatPrice(snapshot.actualPriceExcludingTax)}). Remonter le prix a ${formatPrice(snapshot.suggestedPriceIncludingTax)}.`
      });
      continue;
    }

    if (actualMarginRate !== null && actualMarginRate < snapshot.effectiveMarginRate - MARGIN_TOLERANCE) {
      alerts.push({
        ...base,
        type: "low_margin",
        severity: "warning",
        message: `Marge reelle ${formatPercent(actualMarginRate)} pour un objectif de ${formatPercent(snapshot.effectiveMarginRate)}. Prix conseille : ${formatPrice(snapshot.suggestedPriceIncludingTax)}.`
      });
      continue;
    }

    if (totalSoldQuantity > 0 && soldQuantity >= topSellerThreshold && snapshot.priceGapIncludingTax < 0) {
      alerts.push({
        ...base,
        type: "star_reprice",
        severity: "info",
        message: `${soldQuantity} portions vendues en ${PERIOD_DAYS} jours mais un prix sous le conseille. Passer a ${formatPrice(snapshot.suggestedPriceIncludingTax)} securiserait la marge.`
      });
      continue;
    }

    if (totalSoldQuantity >= MIN_SALES_FOR_ROTATION && soldQuantity < slowMoverThreshold) {
      alerts.push({
        ...base,
        type: "slow_mover",
        severity: "info",
        message: `Seulement ${soldQuantity} vente(s) en ${PERIOD_DAYS} jours. Candidat a retirer de la carte ou a mettre en avant.`
      });
    }
  }

  alerts.sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || a.dishName.localeCompare(b.dishName)
  );

  const counts: Record<PricingAlertSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const alert of alerts) {
    counts[alert.severity] += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    periodDays: PERIOD_DAYS,
    totalSoldQuantity,
    counts,
    alerts
  };
}
