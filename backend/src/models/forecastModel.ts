import { Document, Schema, Types, model } from "mongoose";
import { ForecastConfidence, SalesTrend } from "../types/business";

export interface IForecastIngredientNeed {
  ingredientId: Types.ObjectId;
  ingredientName: string;
  unit: string;
  quantity: number;
  estimatedCost: number;
}

export interface IForecastAlert {
  dishId: Types.ObjectId;
  dishName: string;
  message: string;
}

export interface IForecastRecommendation {
  dish: Types.ObjectId;
  dishName: string;
  category: string;
  initialForecastQuantity: number;
  recommendedQuantity: number;
  baselineQuantity: number;
  trend: SalesTrend;
  confidence: ForecastConfidence;
  historyDaysUsed: number;
  weekdayAverage: number;
  recentAverage: number;
  longAverage: number;
  suggestedPrice: number;
  suggestedPriceIncludingTax: number;
  actualPriceIncludingTax: number;
  projectedRevenue: number;
  projectedFoodCost: number;
  comment: string;
  userCorrectionQuantity?: number | null;
  correctionComment?: string;
  correctedAt?: Date | null;
  correctedBy?: Types.ObjectId | null;
}

export interface IForecast extends Document {
  targetDate: Date;
  owner?: Types.ObjectId | null;
  generatedBy?: Types.ObjectId | null;
  dishes: IForecastRecommendation[];
  ingredientNeeds: IForecastIngredientNeed[];
  totals: {
    totalProjectedRevenue: number;
    totalProjectedPlates: number;
    chargePerServing: number;
  };
  alerts: IForecastAlert[];
  created_at: Date;
  updated_at: Date;
}

const forecastRecommendationSchema = new Schema<IForecastRecommendation>({
  dish: { type: Schema.Types.ObjectId, ref: "Dish", required: true },
  dishName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  initialForecastQuantity: { type: Number, required: true, min: 0 },
  recommendedQuantity: { type: Number, required: true, min: 0 },
  baselineQuantity: { type: Number, required: true, min: 0 },
  trend: { type: String, enum: ["up", "steady", "down"], required: true },
  confidence: { type: String, enum: ["low", "medium", "high"], required: true },
  historyDaysUsed: { type: Number, required: true, min: 0 },
  weekdayAverage: { type: Number, required: true, min: 0 },
  recentAverage: { type: Number, required: true, min: 0 },
  longAverage: { type: Number, required: true, min: 0 },
  suggestedPrice: { type: Number, required: true, min: 0 },
  suggestedPriceIncludingTax: { type: Number, required: true, min: 0 },
  actualPriceIncludingTax: { type: Number, required: true, min: 0 },
  projectedRevenue: { type: Number, required: true, min: 0 },
  projectedFoodCost: { type: Number, required: true, min: 0 },
  comment: { type: String, default: "" },
  userCorrectionQuantity: { type: Number, min: 0, default: null },
  correctionComment: { type: String, default: "" },
  correctedAt: { type: Date, default: null },
  correctedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, {
  _id: false
});

const forecastIngredientNeedSchema = new Schema<IForecastIngredientNeed>({
  ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
  ingredientName: { type: String, required: true, trim: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  estimatedCost: { type: Number, required: true, min: 0 }
}, {
  _id: false
});

const forecastAlertSchema = new Schema<IForecastAlert>({
  dishId: { type: Schema.Types.ObjectId, ref: "Dish", required: true },
  dishName: { type: String, required: true, trim: true },
  message: { type: String, required: true }
}, {
  _id: false
});

const forecastSchema = new Schema<IForecast>({
  targetDate: { type: Date, required: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  dishes: { type: [forecastRecommendationSchema], default: [] },
  ingredientNeeds: { type: [forecastIngredientNeedSchema], default: [] },
  totals: {
    totalProjectedRevenue: { type: Number, required: true, min: 0, default: 0 },
    totalProjectedPlates: { type: Number, required: true, min: 0, default: 0 },
    chargePerServing: { type: Number, required: true, min: 0, default: 0 }
  },
  alerts: { type: [forecastAlertSchema], default: [] }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

forecastSchema.index({ owner: 1, targetDate: 1 }, { unique: true });

export const ForecastModel = model<IForecast>("Forecast", forecastSchema);
