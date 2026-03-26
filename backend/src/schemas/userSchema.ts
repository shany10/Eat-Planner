import { z } from "zod";

export const registerUserBody = z.object({
  firstname: z.string().min(1, "firstname requis"),
  lastname: z.string()
    .min(1, "lastname requis")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/, "Pas de chiffres dans lastname"),
  email: z.email("email invalide"),
  password: z.string().min(8, "mot de passe trop court"),
});

export const createUserBody = z.object({
  firstname: z.string().min(1, "firstname requis"),
  lastname: z.string()
    .min(1, "lastname requis")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/, "Pas de chiffres dans lastname"),
  email: z.email("email invalide"),
  password: z.string().min(8, "mot de passe trop court"),
  role: z.enum(["admin", "manager", "employee"]),
  active: z.boolean().optional().default(true),
});

export const updateOwnProfileBody = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/).optional(),
  email: z.email().optional(),
  password: z.string().min(8).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: "Au moins un champ est requis" });

export const updateUserBody = createUserBody
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: "Au moins un champ est requis" });

export const changeRoleBody = z.object({
  role: z.enum(["admin", "manager", "employee"]),
});

export const authUserBody = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type RegisterUserInput = z.infer<typeof registerUserBody>;
export type CreateUserInput = z.infer<typeof createUserBody>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileBody>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;
export type ChangeRoleInput = z.infer<typeof changeRoleBody>;
export type AuthUserInput = z.infer<typeof authUserBody>;