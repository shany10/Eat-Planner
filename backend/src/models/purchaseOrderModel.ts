import { Document, Schema, Types, model } from "mongoose";
import {
  BUSINESS_UNITS,
  BusinessUnit,
  PAYMENT_METHODS,
  PaymentMethod,
  PURCHASE_ORDER_STATUSES,
  PurchaseOrderStatus
} from "../types/business";

export interface IPurchaseOrderItem {
  ingredient: Types.ObjectId;
  ingredientName: string;
  category: string;
  supplier?: Types.ObjectId | null;
  supplierName: string;
  quantity: number;
  unit: BusinessUnit;
  unitPrice: number;
  stockQuantity: number;
  minimumStock: number;
  recommendedQuantity: number;
  lineTotal: number;
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  supplier: Types.ObjectId;
  suppliers: Types.ObjectId[];
  owner?: Types.ObjectId | null;
  status: PurchaseOrderStatus;
  requestedDeliveryDate?: string;
  estimatedDeliveryDate?: string;
  deliveryAddress?: string;
  internalComment?: string;
  notes?: string;
  items: IPurchaseOrderItem[];
  deliveryFee: number;
  vatRate: number;
  totalExclTax: number;
  vatAmount: number;
  totalInclTax: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod | "";
  paidAt?: Date | null;
  validatedAt?: Date | null;
  managementScoreDelta: number;
  badges: string[];
  created_at: Date;
  updated_at: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
  ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
  ingredientName: { type: String, required: true, trim: true },
  category: { type: String, default: "" },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
  supplierName: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, enum: BUSINESS_UNITS, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  minimumStock: { type: Number, required: true, min: 0, default: 0 },
  recommendedQuantity: { type: Number, required: true, min: 0, default: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, {
  _id: false,
  strict: true
});

const purchaseOrderSchema = new Schema<IPurchaseOrder>({
  orderNumber: { type: String, required: true, trim: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  suppliers: [{ type: Schema.Types.ObjectId, ref: "Supplier", default: [] }],
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  status: { type: String, enum: PURCHASE_ORDER_STATUSES, default: "draft", index: true },
  requestedDeliveryDate: { type: String, default: "" },
  estimatedDeliveryDate: { type: String, default: "" },
  deliveryAddress: { type: String, default: "" },
  internalComment: { type: String, default: "" },
  notes: { type: String, default: "" },
  items: { type: [purchaseOrderItemSchema], required: true, default: [] },
  deliveryFee: { type: Number, required: true, min: 0, default: 0 },
  vatRate: { type: Number, required: true, min: 0, default: 0.1 },
  totalExclTax: { type: Number, required: true, min: 0, default: 0 },
  vatAmount: { type: Number, required: true, min: 0, default: 0 },
  totalInclTax: { type: Number, required: true, min: 0, default: 0 },
  totalAmount: { type: Number, required: true, min: 0, default: 0 },
  paymentMethod: { type: String, enum: [...PAYMENT_METHODS, ""], default: "" },
  paidAt: { type: Date, default: null },
  validatedAt: { type: Date, default: null },
  managementScoreDelta: { type: Number, required: true, default: 0 },
  badges: { type: [String], default: [] }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const PurchaseOrderModel = model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema);
