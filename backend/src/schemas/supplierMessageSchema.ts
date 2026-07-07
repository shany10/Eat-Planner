import { z } from "zod";

export const sendSupplierMessageBody = z.object({
  supplier: z.string().min(1),
  subject: z.string().min(2).max(160),
  body: z.string().min(2).max(4000)
});

export const replySupplierMessageBody = z.object({
  subject: z.string().min(2).max(160).optional().default("Reponse fournisseur"),
  body: z.string().min(2).max(4000)
});

export type SendSupplierMessageInput = z.infer<typeof sendSupplierMessageBody>;
export type ReplySupplierMessageInput = z.infer<typeof replySupplierMessageBody>;
