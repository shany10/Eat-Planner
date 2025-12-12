import { Router } from "express";
import { ScoreModel } from "../models";

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

export { scoreRouter };