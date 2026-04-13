import { z } from "zod";

export const saleItemBody = z.object({
  dish: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional()
});

export const createSaleBody = z.object({
  serviceDate: z.string().min(1),
  notes: z.string().optional().default(""),
  items: z.array(saleItemBody).min(1)
});

export type CreateSaleInput = z.infer<typeof createSaleBody>;
