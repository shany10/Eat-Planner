import { z } from "zod";
import { BUSINESS_UNITS } from "../types/business";

export const dishIngredientLineBody = z.object({
  ingredient: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(BUSINESS_UNITS)
});

export const createDishBody = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional().default(""),
  targetMarginRate: z.number().min(0).max(0.95).optional().default(0.72),
  estimatedDailyServings: z.number().int().positive().optional().default(15),
  active: z.boolean().optional().default(true),
  ingredients: z.array(dishIngredientLineBody).min(1)
});

export const updateDishBody = createDishBody.partial();

export type CreateDishInput = z.infer<typeof createDishBody>;
export type UpdateDishInput = z.infer<typeof updateDishBody>;
