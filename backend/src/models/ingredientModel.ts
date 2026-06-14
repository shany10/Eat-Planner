import { Document, Schema, Types, model } from "mongoose";
import { BUSINESS_UNITS, BusinessUnit, INGREDIENT_CATEGORIES, IngredientCategory } from "../types/business";

export interface IIngredient extends Document {
  name: string;
  category: IngredientCategory;
  unit: BusinessUnit;
  orderUnit: BusinessUnit;
  purchasePrice: number;
  stockQuantity: number;
  minimumStock: number;
  averageDailyUsage: number;
  minimumOrderQuantity: number;
  supplier?: Types.ObjectId | null;
  owner?: Types.ObjectId | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ingredientSchema = new Schema<IIngredient>({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: INGREDIENT_CATEGORIES, default: "Epicerie seche", index: true },
  unit: { type: String, enum: BUSINESS_UNITS, required: true },
  orderUnit: { type: String, enum: BUSINESS_UNITS, default: "kg" },
  purchasePrice: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  minimumStock: { type: Number, required: true, min: 0, default: 0 },
  averageDailyUsage: { type: Number, required: true, min: 0, default: 0 },
  minimumOrderQuantity: { type: Number, required: true, min: 0, default: 0 },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const IngredientModel = model<IIngredient>("Ingredient", ingredientSchema);
