import { z } from "zod";
import { CHARGE_CATEGORIES, CHARGE_PERIODS } from "../types/business";

export const createChargeBody = z.object({
  name: z.string().min(2),
  category: z.enum(CHARGE_CATEGORIES),
  amount: z.number().nonnegative(),
  period: z.enum(CHARGE_PERIODS),
  active: z.boolean().optional().default(true)
});

export const updateChargeBody = createChargeBody.partial();

export type CreateChargeInput = z.infer<typeof createChargeBody>;
export type UpdateChargeInput = z.infer<typeof updateChargeBody>;
