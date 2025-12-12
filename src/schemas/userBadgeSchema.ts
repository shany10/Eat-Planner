import { z } from "zod";

export const createUserBadgeBody = z.object({
  user: z.string().min(1, "L'ID utilisateur est requis"),
  badge: z.string().min(1, "L'ID badge est requis"),
  reason: z.string().optional(),
});

export type CreateUserBadgeInput = z.infer<typeof createUserBadgeBody>;