import { z } from "zod";

export const createSocialChallengeBody = z.object({
  challenge: z.string().min(1, "L'ID du défi est requis"),
  inviter: z.string().min(1, "L'ID du inviteur est requis"),
  invitee: z.string().min(1, "L'ID de l'invité est requis"),
});

export const updateSocialChallengeBody = z.object({
  status: z.enum(["pending", "accepted", "declined", "completed"]),
});

export type CreateSocialChallengeInput = z.infer<typeof createSocialChallengeBody>;
export type UpdateSocialChallengeInput = z.infer<typeof updateSocialChallengeBody>;
