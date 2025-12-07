import { z } from "zod";

export const createScoreBody = z.object({
  user: z.string().min(1, "L'ID utilisateur est requis"),
});

export const updateScoreBody = z.object({
  totalPoints: z.number().optional().default(0),
  challengesCompleted: z.number().optional().default(0),
  badgesEarned: z.number().optional().default(0),
});

export type CreateScoreInput = z.infer<typeof createScoreBody>;
export type UpdateScoreInput = z.infer<typeof updateScoreBody>;
