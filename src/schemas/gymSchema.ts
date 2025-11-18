import { z } from "zod";

export const createGymBody = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  capacity: z.number().int().min(1, "La capacité doit être au moins 1"),
  equipment: z.array(z.string()).optional().default([]),
  owner: z.string().min(1, "L'ID du propriétaire est requis"),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional(),
});

export const updateGymBody = createGymBody
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Au moins un champ est requis",
  });

export const approveGymBody = z.object({
  approved: z.boolean(),
});

export type CreateGymInput = z.infer<typeof createGymBody>;
export type UpdateGymInput = z.infer<typeof updateGymBody>;
