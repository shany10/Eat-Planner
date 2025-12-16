import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createSocialChallengeBody } from "../schemas/socialChallengeSchema";
import { SocialChallengeModel } from "../models";

const socialRouter = Router();

socialRouter.post('/invite', authMiddleware, validateMiddleware({ body: createSocialChallengeBody }), async (req, res): Promise<void> => {
    const created = await SocialChallengeModel.create(req.body);
    res.status(201).json(created);
});

socialRouter.patch('/:id/status', authMiddleware, async (req, res): Promise<void> => {
    const { status } = req.body;
    const updated = await SocialChallengeModel.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updated);
});

socialRouter.get('/invitations/:userId', authMiddleware, async (req, res): Promise<void> => {
    const invites = await SocialChallengeModel.find({ invitee: req.params.userId, status: 'pending' }).populate('challenge', 'title');
    res.json(invites);
});

export { socialRouter };