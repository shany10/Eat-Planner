import { z } from "zod";

export const createExerciseTypeBody = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().min(1, "La description est requise"),
  targetedMuscles: z.array(z.string()).optional().default([]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

export const updateExerciseTypeBody = createExerciseTypeBody
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Au moins un champ est requis",
  });

export type CreateExerciseTypeInput = z.infer<typeof createExerciseTypeBody>;
export type UpdateExerciseTypeInput = z.infer<typeof updateExerciseTypeBody>;
