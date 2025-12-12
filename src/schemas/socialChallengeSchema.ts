import { z } from "zod";
export const createSocialChallengeBody = z.object({
    challenge: z.string().min(1),
    inviter: z.string().min(1),
    invitee: z.string().min(1),
});