export const BUSINESS_UNITS = [
  "g",
  "kg",
  "ml",
  "cl",
  "l",
  "piece",
  "carton",
  "sac",
  "bouteille",
  "barquette",
  "boite"
] as const;
export type BusinessUnit = typeof BUSINESS_UNITS[number];

export const INGREDIENT_CATEGORIES = [
  "Viandes",
  "Poissons",
  "Fruits et legumes",
  "Produits laitiers",
  "Epicerie seche",
  "Boissons",
  "Surgeles",
  "Boulangerie",
  "Condiments",
  "Produits d entretien"
] as const;
export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

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

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "pending_validation",
  "validated",
  "pending_payment",
  "paid",
  "delivering",
  "delivered",
  "cancelled",
  "sent",
  "received"
] as const;
export type PurchaseOrderStatus = typeof PURCHASE_ORDER_STATUSES[number];

export const PAYMENT_METHODS = [
  "fake_card",
  "fake_transfer",
  "payment_on_delivery",
  "purchase_order"
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
