import { Document, Schema, Types, model } from "mongoose";
import { BUSINESS_UNITS, BusinessUnit } from "../types/business";

export interface IIngredient extends Document {
  name: string;
  unit: BusinessUnit;
  purchasePrice: number;
  supplier?: Types.ObjectId | null;
  owner?: Types.ObjectId | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ingredientSchema = new Schema<IIngredient>({
  name: { type: String, required: true, trim: true },
  unit: { type: String, enum: BUSINESS_UNITS, required: true },
  purchasePrice: { type: Number, required: true, min: 0 },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const IngredientModel = model<IIngredient>("Ingredient", ingredientSchema);
