import { z } from "zod";

export const createUserBody = z.object({
  firstname: z.string().min(1, "firstname requis"),
  lastname: z.string()
    .min(1, "lastname requis")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/, "Pas de chiffres dans lastname"),
  email: z.string().email("email invalide"),
  password: z.string().min(8, "mot de passe trop court"),
  role: z.enum(["admin", "manager", "employee"]),
  active: z.boolean().optional().default(true),
  restaurantName: z.string().min(2).max(100).optional().default("Mon restaurant"),
  defaultMarginRate: z.number().min(0).max(0.95).optional().default(0.72),
  vatRate: z.number().min(0).max(1).optional().default(0.1),
});

export const registerUserBody = createUserBody.pick({
  firstname: true,
  lastname: true,
  email: true,
  password: true
});

export const updateOwnProfileBody = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).regex(/^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: "Au moins un champ est requis" });

export const updateUserBody = createUserBody
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: "Au moins un champ est requis" });

export const updateAccountSettingsBody = z.object({
  restaurantName: z.string().min(2).max(100),
  defaultMarginRate: z.number().min(0).max(0.95),
  vatRate: z.number().min(0).max(1)
});

export const changeRoleBody = z.object({
  role: z.enum(["admin", "manager", "employee"]),
});

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
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileBody>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;
export type UpdateAccountSettingsInput = z.infer<typeof updateAccountSettingsBody>;
export type ChangeRoleInput = z.infer<typeof changeRoleBody>;
export type AuthUserInput = z.infer<typeof authUserBody>;
export type Verify2faInput = z.infer<typeof verify2faBody>;
export type TotpCodeInput = z.infer<typeof totpCodeBody>;
export type OauthGoogleInput = z.infer<typeof oauthGoogleBody>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBody>;
