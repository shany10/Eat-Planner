import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createChallengeBody, CreateChallengeInput, updateChallengeBody, UpdateChallengeInput, joinChallengeBody, JoinChallengeInput } from "../schemas";
import { ChallengeModel } from "../models";

const challengeRouter = Router();

// Récupérer tous les défis
challengeRouter.get('/getAll', async (req, res): Promise<void> => {
  try {
    const challenges = await ChallengeModel.find()
      .populate('creator', 'firstname lastname email')
      .populate('exerciseType', 'name difficulty')
      .populate('gym', 'name')
      .exec();
    res.status(200).json(challenges);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des défis" });
  }
});

// Récupérer les défis avec filtres
challengeRouter.get('/filter', async (req, res): Promise<void> => {
  try {
    const { difficulty, exerciseType, duration } = req.query;
    const filter: any = {};

    if (difficulty) filter.difficulty = difficulty;
    if (exerciseType) filter.exerciseType = exerciseType;
    if (duration) filter.duration = { $lte: parseInt(duration as string) };

    const challenges = await ChallengeModel.find(filter)
      .populate('creator', 'firstname lastname email')
      .populate('exerciseType', 'name difficulty')
      .exec();
    
    res.status(200).json(challenges);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du filtrage des défis" });
  }
});

// Récupérer un défi par ID
challengeRouter.get('/:id', async (req, res): Promise<void> => {
  try {
    const challenge = await ChallengeModel.findById(req.params.id)
      .populate('creator', 'firstname lastname email')
      .populate('exerciseType', 'name difficulty')
      .populate('participants', 'firstname lastname email')
      .exec();
    
    if (!challenge) {
      res.status(404).json({ error: "Défi non trouvé" });
      return;
    }
    res.status(200).json(challenge);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du défi" });
  }
});

// Créer un nouveau défi
challengeRouter.post('/create', authMiddleware, validateMiddleware({ body: createChallengeBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateChallengeInput;
    const created = await ChallengeModel.create(input);
    res.status(201).json({ message: "Défi créé avec succès", challenge: created });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du défi" });
  }
});

// Rejoindre un défi
challengeRouter.post('/:id/join', authMiddleware, validateMiddleware({ body: joinChallengeBody }), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body as JoinChallengeInput;

    const challenge = await ChallengeModel.findById(id).exec();
    if (!challenge) {
      res.status(404).json({ error: "Défi non trouvé" });
      return;
    }

    if (challenge.participants.includes(userId as any)) {
      res.status(400).json({ error: "Utilisateur déjà participant" });
      return;
    }

    challenge.participants.push(userId as any);
    await challenge.save();

    res.status(200).json({ message: "Utilisateur ajouté au défi", challenge });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout au défi" });
  }
});

// Modifier un défi
challengeRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateChallengeBody }), async (req, res): Promise<void> => {
  try {
    const updates = req.body as UpdateChallengeInput;
    const updated = await ChallengeModel.findByIdAndUpdate(req.params.id, updates, { new: true }).exec();
    
    if (!updated) {
      res.status(404).json({ error: "Défi non trouvé" });
      return;
    }
    res.status(200).json({ message: "Défi mis à jour", challenge: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du défi" });
  }
});

// Supprimer un défi
challengeRouter.delete('/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    const deleted = await ChallengeModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Défi non trouvé" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression du défi" });
  }
});

export { challengeRouter };
