import { z } from "zod";
import { BUSINESS_UNITS } from "../types/business";

export const createIngredientBody = z.object({
  name: z.string().min(2),
  unit: z.enum(BUSINESS_UNITS),
  purchasePrice: z.number().nonnegative(),
  supplier: z.string().optional().nullable(),
  active: z.boolean().optional().default(true)
});

export const updateIngredientBody = createIngredientBody.partial();

export type CreateIngredientInput = z.infer<typeof createIngredientBody>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientBody>;
