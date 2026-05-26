export const BUSINESS_UNITS = ["g", "kg", "ml", "cl", "l", "piece"] as const;
export type BusinessUnit = typeof BUSINESS_UNITS[number];

export const CHARGE_PERIODS = ["daily", "monthly"] as const;
export type ChargePeriod = typeof CHARGE_PERIODS[number];

export const CHARGE_CATEGORIES = [
  "staff",
  "utilities",
  "rent",
  "equipment",
  "insurance",
  "subscriptions",
  "other"
] as const;
export type ChargeCategory = typeof CHARGE_CATEGORIES[number];

export const SALES_TRENDS = ["up", "steady", "down"] as const;
export type SalesTrend = typeof SALES_TRENDS[number];

export const FORECAST_CONFIDENCE = ["low", "medium", "high"] as const;
export type ForecastConfidence = typeof FORECAST_CONFIDENCE[number];
