import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createSocialChallengeBody, CreateSocialChallengeInput, updateSocialChallengeBody, UpdateSocialChallengeInput } from "../schemas";
import { SocialChallengeModel } from "../models";

const socialChallengeRouter = Router();

// Récupérer les invitations reçues par un utilisateur
socialChallengeRouter.get('/invitations/:userId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const invitations = await SocialChallengeModel.find({ invitee: req.params.userId })
      .populate('challenge', 'title description')
      .populate('inviter', 'firstname lastname email')
      .exec();
    res.status(200).json(invitations);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des invitations" });
  }
});

// Récupérer les invitations envoyées par un utilisateur
socialChallengeRouter.get('/sent/:userId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const sent = await SocialChallengeModel.find({ inviter: req.params.userId })
      .populate('challenge', 'title description')
      .populate('invitee', 'firstname lastname email')
      .exec();
    res.status(200).json(sent);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des défis envoyés" });
  }
});

// Inviter un ami à un défi
socialChallengeRouter.post('/invite', authMiddleware, validateMiddleware({ body: createSocialChallengeBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateSocialChallengeInput;
    
    // Vérifier que l'inviteur ne s'invite pas lui-même
    if (input.inviter === input.invitee) {
      res.status(400).json({ error: "Vous ne pouvez pas vous inviter vous-même" });
      return;
    }

    // Vérifier qu'une invitation n'existe pas déjà
    const existing = await SocialChallengeModel.findOne({
      challenge: input.challenge,
      inviter: input.inviter,
      invitee: input.invitee
    }).exec();

    if (existing) {
      res.status(400).json({ error: "Une invitation existe déjà pour ce défi" });
      return;
    }

    const invitation = await SocialChallengeModel.create(input);
    res.status(201).json({ message: "Invitation envoyée", socialChallenge: invitation });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi de l'invitation" });
  }
});

// Accepter une invitation
socialChallengeRouter.patch('/:id/accept', authMiddleware, async (req, res): Promise<void> => {
  try {
    const updated = await SocialChallengeModel.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", respondedAt: new Date() },
      { new: true }
    ).exec();

    if (!updated) {
      res.status(404).json({ error: "Invitation non trouvée" });
      return;
    }

    res.status(200).json({ message: "Invitation acceptée", socialChallenge: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'acceptation de l'invitation" });
  }
});

// Refuser une invitation
socialChallengeRouter.patch('/:id/decline', authMiddleware, async (req, res): Promise<void> => {
  try {
    const updated = await SocialChallengeModel.findByIdAndUpdate(
      req.params.id,
      { status: "declined", respondedAt: new Date() },
      { new: true }
    ).exec();

    if (!updated) {
      res.status(404).json({ error: "Invitation non trouvée" });
      return;
    }

    res.status(200).json({ message: "Invitation refusée", socialChallenge: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du refus de l'invitation" });
  }
});

// Marquer un défi social comme complété
socialChallengeRouter.patch('/:id/complete', authMiddleware, async (req, res): Promise<void> => {
  try {
    const updated = await SocialChallengeModel.findByIdAndUpdate(
      req.params.id,
      { status: "completed" },
      { new: true }
    ).exec();

    if (!updated) {
      res.status(404).json({ error: "Défi social non trouvé" });
      return;
    }

    res.status(200).json({ message: "Défi complété", socialChallenge: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la completion du défi" });
  }
});

export { socialChallengeRouter };
