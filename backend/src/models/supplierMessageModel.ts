import { Document, Schema, Types, model } from "mongoose";

export type SupplierMessageStatus = "sent" | "failed";
export type SupplierMessageDirection = "outbound" | "inbound";

export interface ISupplierMessage extends Document {
  supplier: Types.ObjectId;
  owner?: Types.ObjectId | null;
  subject: string;
  body: string;
  direction: SupplierMessageDirection;
  from: string;
  to: string;
  status: SupplierMessageStatus;
  sentAt?: Date | null;
  errorMessage?: string;
  created_at: Date;
  updated_at: Date;
}

const supplierMessageSchema = new Schema<ISupplierMessage>({
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  direction: { type: String, enum: ["outbound", "inbound"], required: true, default: "outbound", index: true },
  from: { type: String, default: "" },
  to: { type: String, required: true, trim: true },
  status: { type: String, enum: ["sent", "failed"], required: true, default: "sent", index: true },
  sentAt: { type: Date, default: null },
  errorMessage: { type: String, default: "" }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

supplierMessageSchema.index({ owner: 1, created_at: -1 });
supplierMessageSchema.index({ supplier: 1, created_at: -1 });

export const SupplierMessageModel = model<ISupplierMessage>("SupplierMessage", supplierMessageSchema);
