import { z } from "zod";

export const createBadgeBody = z.object({
  name: z.string().min(1, "Badge name is required"),
  description: z.string().min(1, "Badge description is required"),
  iconUrl: z.string().url("Invalid URL format"),
});

export const updateBadgeBody = createBadgeBody
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: "At least one field is required" });

export type CreateBadgeInput = z.infer<typeof createBadgeBody>;
export type UpdateBadgeInput = z.infer<typeof updateBadgeBody>;