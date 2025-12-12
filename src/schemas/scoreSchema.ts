import { z } from "zod";

export const createScoreBody = z.object({
    user: z.string().min(1),
});

export const updateScoreBody = z.object({
    totalPoints: z.number().optional(),
});