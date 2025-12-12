import { z } from "zod";

export const createTrainingStatBody = z.object({
    user: z.string().min(1, "L'ID utilisateur est requis"),
    challenge: z.string().min(1, "L'ID du défi est requis"),
    sessionDate: z.iso.datetime(),
    duration: z.number().int().min(1, "La durée doit être au moins 1 minute"),
    caloriesBurned: z.number().min(0, "Les calories ne peuvent pas être négatives"),
    notes: z.string().optional(),
    completed: z.boolean().optional().default(false),
});

export const updateTrainingStatBody = createTrainingStatBody
    .partial()
    .refine((obj) => Object.keys(obj).length > 0, {
        message: "Au moins un champ est requis",
    });

export type CreateTrainingStatInput = z.infer<typeof createTrainingStatBody>;
export type UpdateTrainingStatInput = z.infer<typeof updateTrainingStatBody>;