import { Document, Schema, Types, model } from "mongoose";
import { BUSINESS_UNITS, BusinessUnit } from "../types/business";

export interface IDishIngredientLine {
  ingredient: Types.ObjectId;
  quantity: number;
  unit: BusinessUnit;
}

export interface IDish extends Document {
  name: string;
  category: string;
  description?: string;
  targetMarginRate: number;
  estimatedDailyServings: number;
  active: boolean;
  ingredients: IDishIngredientLine[];
  created_at: Date;
  updated_at: Date;
}

const dishIngredientSchema = new Schema<IDishIngredientLine>({
  ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, enum: BUSINESS_UNITS, required: true }
}, {
  _id: false
});

const dishSchema = new Schema<IDish>({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  targetMarginRate: { type: Number, required: true, min: 0, max: 0.95, default: 0.72 },
  estimatedDailyServings: { type: Number, required: true, min: 1, default: 15 },
  active: { type: Boolean, default: true },
  ingredients: { type: [dishIngredientSchema], default: [] }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const DishModel = model<IDish>("Dish", dishSchema);
