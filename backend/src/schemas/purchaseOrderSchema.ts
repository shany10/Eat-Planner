import { z } from "zod";
import { BUSINESS_UNITS, PAYMENT_METHODS, PURCHASE_ORDER_STATUSES } from "../types/business";

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

export const fakePaymentBody = z.object({
  method: z.enum(PAYMENT_METHODS),
  holderName: z.string().optional().default(""),
  cardNumber: z.string().optional().default(""),
  expirationDate: z.string().optional().default(""),
  cvv: z.string().optional().default(""),
  billingAddress: z.string().optional().default("")
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderBody>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderBody>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusBody>;
export type FakePaymentInput = z.infer<typeof fakePaymentBody>;
