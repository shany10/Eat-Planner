import { z } from "zod";

export const createSupplierBody = z.object({
  name: z.string().min(2),
  contactName: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  phone: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  active: z.boolean().optional().default(true)
});

export const updateSupplierBody = createSupplierBody.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierBody>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierBody>;
