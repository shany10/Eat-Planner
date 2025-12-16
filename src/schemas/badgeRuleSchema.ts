import { z } from "zod";

export const createBadgeRuleBody = z.object({
  badgeName: z.string().min(1, "Badge name is required"),
  conditionType: z.enum(["totalPoints", "completedTrainings", "custom"], {
    message: "Invalid condition type"
  }).default("totalPoints"),
  conditionField: z.string().min(1, "Condition field is required"),
  operator: z.enum([">=", ">", "=", "<", "<="], {
    message: "Invalid operator"
  }).default(">="),
  value: z.number().int().min(0, "Value must be a positive integer"),
  customCondition: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const updateBadgeRuleBody = createBadgeRuleBody
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: "At least one field is required" });

export type CreateBadgeRuleInput = z.infer<typeof createBadgeRuleBody>;
export type UpdateBadgeRuleInput = z.infer<typeof updateBadgeRuleBody>;
