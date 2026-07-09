import { z } from "zod";
import { BUSINESS_UNITS, PURCHASE_ORDER_STATUSES } from "../types/business";

export const purchaseOrderItemBody = z.object({
  ingredient: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(BUSINESS_UNITS),
  unitPrice: z.number().nonnegative(),
  recommendedQuantity: z.number().nonnegative().optional().default(0)
});

export const createPurchaseOrderBody = z.object({
  supplier: z.string().min(1),
  deliveryAddress: z.string().optional().default(""),
  internalComment: z.string().optional().default(""),
  requestedDeliveryDate: z.string().optional().default(""),
  estimatedDeliveryDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.enum(PURCHASE_ORDER_STATUSES).optional().default("draft"),
  vatRate: z.number().min(0).max(1).optional().default(0.1),
  items: z.array(purchaseOrderItemBody).min(1)
});

export const updatePurchaseOrderBody = createPurchaseOrderBody.partial().extend({
  items: z.array(purchaseOrderItemBody).min(1).optional()
});

export const updatePurchaseOrderStatusBody = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES)
});

export const receivePurchaseOrderBody = z.object({
  // Optional per-ingredient adjustment; when omitted the ordered quantity is
  // received as-is. Used to increment ingredient stock on delivery.
  items: z.array(z.object({
    ingredient: z.string().min(1),
    receivedQuantity: z.number().nonnegative()
  })).optional().default([])
});

export const bankTransferPaymentBody = z.object({
  accountHolder: z.string().min(2).max(120),
  iban: z.string().min(14).max(42).regex(/^[A-Za-z]{2}[0-9A-Za-z ]+$/),
  bic: z.string().min(8).max(11).regex(/^[A-Za-z0-9]+$/).optional().default(""),
  reference: z.string().max(80).optional().default(""),
  executionDate: z.string().optional().default(""),
  note: z.string().max(400).optional().default(""),
  notifySupplier: z.boolean().optional().default(true)
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderBody>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderBody>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusBody>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderBody>;
export type BankTransferPaymentInput = z.infer<typeof bankTransferPaymentBody>;
