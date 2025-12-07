import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createTrainingStatBody, CreateTrainingStatInput, updateTrainingStatBody, UpdateTrainingStatInput } from "../schemas";
import { TrainingStatModel } from "../models";

const trainingStatRouter = Router();

// Récupérer les statistiques d'un utilisateur
trainingStatRouter.get('/user/:userId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const stats = await TrainingStatModel.find({ user: req.params.userId })
      .populate('user', 'firstname lastname email')
      .populate('challenge', 'title description')
      .exec();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
  }
});

// Récupérer les statistiques d'un défi
trainingStatRouter.get('/challenge/:challengeId', authMiddleware, async (req, res): Promise<void> => {
  try {
    const stats = await TrainingStatModel.find({ challenge: req.params.challengeId })
      .populate('user', 'firstname lastname email')
      .populate('challenge', 'title')
      .exec();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques du défi" });
  }
});

// Créer une nouvelle statistique d'entraînement
trainingStatRouter.post('/create', authMiddleware, validateMiddleware({ body: createTrainingStatBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateTrainingStatInput;
    const created = await TrainingStatModel.create(input);
    res.status(201).json({ message: "Statistique créée", trainingStat: created });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création de la statistique" });
  }
});

// Modifier une statistique
trainingStatRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateTrainingStatBody }), async (req, res): Promise<void> => {
  try {
    const updates = req.body as UpdateTrainingStatInput;
    const updated = await TrainingStatModel.findByIdAndUpdate(req.params.id, updates, { new: true }).exec();
    
    if (!updated) {
      res.status(404).json({ error: "Statistique non trouvée" });
      return;
    }
    res.status(200).json({ message: "Statistique mise à jour", trainingStat: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour de la statistique" });
  }
});

// Supprimer une statistique
trainingStatRouter.delete('/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    const deleted = await TrainingStatModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Statistique non trouvée" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression de la statistique" });
  }
});

export { trainingStatRouter };
