import { z } from "zod";

export const createUserBody = z.object({
  firstname: z.string().min(1, "firstname requis"),
  lastname: z.string()
    .min(1, "lastname requis")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/, "Pas de chiffres dans lastname"),
  email: z.email("email invalide"),
  password: z.string().min(8, "mot de passe trop court"),
  role: z.enum(["admin", "manager"]),
  active: z.boolean().optional().default(true),
});

export const registerUserBody = createUserBody.pick({
  firstname: true,
  lastname: true,
  email: true,
  password: true
});

export const updateUserBody = createUserBody
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: "Au moins un champ est requis" });

export const authUserBody = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const verify2faBody = z.object({
  mfaToken: z.string().min(1, "mfaToken requis"),
  code: z.string().regex(/^\d{6}$/, "Code 2FA invalide")
});

export const totpCodeBody = z.object({
  code: z.string().regex(/^\d{6}$/, "Code 2FA invalide")
});

export const oauthGoogleBody = z.object({
  idToken: z.string().min(1, "idToken requis")
});

export const forgotPasswordBody = z.object({
  email: z.string().email("Email invalide")
});

export const resetPasswordBody = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(8, "mot de passe trop court")
});

export type CreateUserInput = z.infer<typeof createUserBody>;
export type RegisterUserInput = z.infer<typeof registerUserBody>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;
export type AuthUserInput = z.infer<typeof authUserBody>;
export type Verify2faInput = z.infer<typeof verify2faBody>;
export type TotpCodeInput = z.infer<typeof totpCodeBody>;
export type OauthGoogleInput = z.infer<typeof oauthGoogleBody>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBody>;
