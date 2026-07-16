import { z } from "zod";

const cardNumberField = z.string()
  .min(12)
  .max(23)
  .regex(/^[\d\s-]+$/, "Numero de carte invalide");

const currentYear = new Date().getFullYear();

export const savePaymentCardBody = z.object({
  holder: z.string().min(2).max(120),
  cardNumber: cardNumberField,
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(currentYear - 1).max(currentYear + 25),
  label: z.string().max(60).optional().default("")
});

export const cardPaymentBody = z.object({
  savedCardId: z.string().min(1).optional(),
  card: z.object({
    holder: z.string().min(2).max(120),
    cardNumber: cardNumberField,
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(currentYear - 1).max(currentYear + 25),
    // Le cryptogramme est verifie en forme mais jamais persiste.
    cvv: z.string().regex(/^\d{3,4}$/)
  }).optional(),
  saveCard: z.boolean().optional().default(false),
  note: z.string().max(500).optional().default(""),
  notifySupplier: z.boolean().optional().default(true)
}).refine(payload => Boolean(payload.savedCardId) || Boolean(payload.card), {
  message: "savedCardId ou card requis"
});

export type SavePaymentCardInput = z.infer<typeof savePaymentCardBody>;
export type CardPaymentInput = z.infer<typeof cardPaymentBody>;
