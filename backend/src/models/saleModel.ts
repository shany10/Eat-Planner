import { Document, Schema, Types, model } from "mongoose";

export interface ISaleItem {
  dish: Types.ObjectId;
  quantity: number;
  unitPrice: number;
}

export interface ISale extends Document {
  serviceDate: Date;
  items: ISaleItem[];
  totalAmount: number;
  notes?: string;
  owner?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const saleItemSchema = new Schema<ISaleItem>({
  dish: { type: Schema.Types.ObjectId, ref: "Dish", required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, {
  _id: false
});

const saleSchema = new Schema<ISale>({
  serviceDate: { type: Date, required: true },
  items: { type: [saleItemSchema], default: [] },
  totalAmount: { type: Number, required: true, min: 0, default: 0 },
  notes: { type: String, default: "" },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const SaleModel = model<ISale>("Sale", saleSchema);
