import { Document, Schema, Types, model } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  owner?: Types.ObjectId | null;
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
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const SupplierModel = model<ISupplier>("Supplier", supplierSchema);
