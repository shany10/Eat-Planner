import { z } from "zod";

export const createSupplierBody = z.object({
  name: z.string().min(2),
  productTypes: z.array(z.string()).optional().default([]),
  deliveryLeadTimeDays: z.number().int().nonnegative().optional().default(2),
  deliveryFee: z.number().nonnegative().optional().default(0),
  minimumOrderAmount: z.number().nonnegative().optional().default(0),
  contactName: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  active: z.boolean().optional().default(true)
});

export const updateSupplierBody = createSupplierBody.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierBody>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierBody>;
