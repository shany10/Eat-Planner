import { z } from "zod";
import { BUSINESS_UNITS, INGREDIENT_CATEGORIES } from "../types/business";

export const createIngredientBody = z.object({
  name: z.string().min(2),
  category: z.enum(INGREDIENT_CATEGORIES).optional().default("Epicerie seche"),
  unit: z.enum(BUSINESS_UNITS),
  orderUnit: z.enum(BUSINESS_UNITS).optional(),
  purchasePrice: z.number().nonnegative(),
  stockQuantity: z.number().nonnegative().optional().default(0),
  minimumStock: z.number().nonnegative().optional().default(0),
  averageDailyUsage: z.number().nonnegative().optional().default(0),
  minimumOrderQuantity: z.number().nonnegative().optional().default(0),
  supplier: z.string().optional().nullable(),
  active: z.boolean().optional().default(true)
});

export const updateIngredientBody = createIngredientBody.partial();

export type CreateIngredientInput = z.infer<typeof createIngredientBody>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientBody>;
