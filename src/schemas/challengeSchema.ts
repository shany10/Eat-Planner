import { z } from "zod";

export const createChallengeBody = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  creator: z.string().min(1, "L'ID du créateur est requis"),
  exerciseType: z.string().min(1, "Le type d'exercice est requis"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration: z.number().int().min(1, "La durée doit être au moins 1 jour"),
  objectives: z.string().min(1, "Les objectifs sont requis"),
  gym: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateChallengeBody = createChallengeBody
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Au moins un champ est requis",
  });

export const joinChallengeBody = z.object({
  userId: z.string().min(1, "L'ID utilisateur est requis"),
});

export type CreateChallengeInput = z.infer<typeof createChallengeBody>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeBody>;
export type JoinChallengeInput = z.infer<typeof joinChallengeBody>;