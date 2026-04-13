import { Document, Schema, model } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const supplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, trim: true },
  contactName: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  notes: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const SupplierModel = model<ISupplier>("Supplier", supplierSchema);
