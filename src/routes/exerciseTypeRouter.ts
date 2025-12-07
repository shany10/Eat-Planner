import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { createExerciseTypeBody, CreateExerciseTypeInput, updateExerciseTypeBody, UpdateExerciseTypeInput } from "../schemas";
import { ExerciseTypeModel } from "../models";

const exerciseTypeRouter = Router();

// Récupérer tous les types d'exercices
exerciseTypeRouter.get('/getAll', async (req, res): Promise<void> => {
  try {
    const types = await ExerciseTypeModel.find().exec();
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des types d'exercices" });
  }
});

// Récupérer un type d'exercice par ID
exerciseTypeRouter.get('/:id', async (req, res): Promise<void> => {
  try {
    const type = await ExerciseTypeModel.findById(req.params.id).exec();
    if (!type) {
      res.status(404).json({ error: "Type d'exercice non trouvé" });
      return;
    }
    res.status(200).json(type);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du type d'exercice" });
  }
});

// Créer un nouveau type d'exercice (ADMIN uniquement)
exerciseTypeRouter.post('/create', authMiddleware, roleMiddleware(["admin"]), validateMiddleware({ body: createExerciseTypeBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateExerciseTypeInput;
    const created = await ExerciseTypeModel.create(input);
    res.status(201).json({ message: "Type d'exercice créé", exerciseType: created });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du type d'exercice" });
  }
});

// Modifier un type d'exercice (ADMIN uniquement)
exerciseTypeRouter.patch('/update/:id', authMiddleware, roleMiddleware(["admin"]), validateMiddleware({ body: updateExerciseTypeBody }), async (req, res): Promise<void> => {
  try {
    const updates = req.body as UpdateExerciseTypeInput;
    const updated = await ExerciseTypeModel.findByIdAndUpdate(req.params.id, updates, { new: true }).exec();
    if (!updated) {
      res.status(404).json({ error: "Type d'exercice non trouvé" });
      return;
    }
    res.status(200).json({ message: "Type d'exercice mis à jour", exerciseType: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du type d'exercice" });
  }
});

// Supprimer un type d'exercice (ADMIN uniquement)
exerciseTypeRouter.delete('/:id', authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
  try {
    const deleted = await ExerciseTypeModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Type d'exercice non trouvé" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression du type d'exercice" });
  }
});

export { exerciseTypeRouter };
