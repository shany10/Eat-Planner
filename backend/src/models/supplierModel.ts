import { Document, Schema, Types, model } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  productTypes: string[];
  deliveryLeadTimeDays: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  owner?: Types.ObjectId | null;
  portalUser?: Types.ObjectId | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const supplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, trim: true },
  productTypes: { type: [String], default: [] },
  deliveryLeadTimeDays: { type: Number, required: true, min: 0, default: 2 },
  deliveryFee: { type: Number, required: true, min: 0, default: 0 },
  minimumOrderAmount: { type: Number, required: true, min: 0, default: 0 },
  contactName: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  notes: { type: String, default: "" },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  portalUser: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const SupplierModel = model<ISupplier>("Supplier", supplierSchema);
