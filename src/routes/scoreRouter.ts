import { Router } from "express";
import { ScoreModel } from "../models";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { addPointsForChallenge } from "../utils/scoreService";
import { addPointsBody } from "../schemas/scoreSchema";

const scoreRouter = Router();

// Leaderboard Top 10
scoreRouter.get('/leaderboard', async (req, res): Promise<void> => {
    try {
        const top = await ScoreModel.find()
            .sort({ totalPoints: -1 }) 
            .limit(10)
            .populate('user', 'firstname lastname email');
        res.json(top);
    } catch (error) { 
        res.status(500).json({ error: "Erreur leaderboard" }); 
    }
});

// Score d'un utilisateur précis
scoreRouter.get('/user/:userId', async (req, res): Promise<void> => {
    try {
        const score = await ScoreModel.findOne({ user: req.params.userId });
        if (!score) { res.status(404).json({ error: "Score non trouvé" }); return; }
        res.json(score);
    } catch (error) { 
        res.status(500).json({ error: "Erreur récupération score" }); 
    }
});

// Route pour ajouter manuellement des points (admin ou système)
scoreRouter.post('/add-points', authMiddleware, validateMiddleware({ body: addPointsBody }), async (req, res): Promise<void> => {
    try {
        const { userId, points } = req.body;

        const score = await ScoreModel.findOne({ user: userId });
        
        if (score) {
            score.totalPoints += points;
            await score.save();
        } else {
            await ScoreModel.create({
                user: userId,
                totalPoints: points,
                challengesCompleted: 0,
                badgesEarned: 0
            });
        }

        res.status(200).json({ message: "Points ajoutés avec succès", points });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'ajout des points" });
    }
});

export { scoreRouter };