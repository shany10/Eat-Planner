import { Router } from "express";
import { authMiddleware, validateMiddleware, roleMiddleware } from "../middlewares";
import { createTrainingStatBody, CreateTrainingStatInput, updateTrainingStatBody, UpdateTrainingStatInput } from "../schemas";
import { TrainingStatModel, ScoreModel } from "../models";
import { BadgeService } from "../utils/badgeService";

const trainingStatRouter = Router();

trainingStatRouter.post('/create', authMiddleware, validateMiddleware({ body: createTrainingStatBody }), async (req, res): Promise<void> => {
    try {
        const input = req.body as CreateTrainingStatInput;
        const created = await TrainingStatModel.create(input);

        if (created.completed) {
            const points = input.duration * 10; // Logique : 10 points par minute
            
            await ScoreModel.findOneAndUpdate(
                { user: input.user },
                { 
                    $inc: { totalPoints: points, challengesCompleted: 1 }, 
                    $setOnInsert: { user: input.user } 
                },
                { upsert: true, new: true }
            );
            
            await BadgeService.checkAndAwardAllBadges(input.user);
        }
        res.status(201).json({ message: "Séance enregistrée", trainingStat: created });
    } catch(error) { 
        res.status(500).json({ error: "Erreur enregistrement" }); 
    }
});

trainingStatRouter.get('/user/:userId', authMiddleware, async (req, res): Promise<void> => {
    try {
        const history = await TrainingStatModel.find({ user: req.params.userId })
            .populate('challenge', 'title description difficulty')
            .sort({ sessionDate: -1 }); // Du plus récent au plus ancien
        res.json(history);
    } catch(error) { 
        res.status(500).json({ error: "Erreur récupération" }); 
    }
});

trainingStatRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateTrainingStatBody }), async (req, res): Promise<void> => {
    try {
        const updates = req.body as UpdateTrainingStatInput;
        const updated = await TrainingStatModel.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!updated) { res.status(404).json({ error: "Statistique introuvable" }); return; }
        res.json(updated);
    } catch(error) { res.status(500).json({ error: "Erreur mise à jour" }); }
});

trainingStatRouter.delete('/:id', authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
    try {
        await TrainingStatModel.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch(error) { res.status(500).json({ error: "Erreur suppression" }); }
});

export { trainingStatRouter };