import { Document, Schema, Types, model } from "mongoose";
import { CHARGE_CATEGORIES, CHARGE_PERIODS, ChargeCategory, ChargePeriod } from "../types/business";

export interface ICharge extends Document {
  name: string;
  category: ChargeCategory;
  amount: number;
  period: ChargePeriod;
  owner?: Types.ObjectId | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const chargeSchema = new Schema<ICharge>({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: CHARGE_CATEGORIES, required: true },
  amount: { type: Number, required: true, min: 0 },
  period: { type: String, enum: CHARGE_PERIODS, required: true, default: "monthly" },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const ChargeModel = model<ICharge>("Charge", chargeSchema);
