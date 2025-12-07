import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { ScoreModel } from "../models";

const scoreRouter = Router();

// Récupérer le score d'un utilisateur
scoreRouter.get('/user/:userId', async (req, res): Promise<void> => {
  try {
    const score = await ScoreModel.findOne({ user: req.params.userId })
      .populate('user', 'firstname lastname email')
      .exec();
    
    if (!score) {
      res.status(404).json({ error: "Score utilisateur non trouvé" });
      return;
    }
    res.status(200).json(score);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du score" });
  }
});

// Récupérer le classement (leaderboard)
scoreRouter.get('/leaderboard/all', async (req, res): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const scores = await ScoreModel.find()
      .populate('user', 'firstname lastname email')
      .sort({ totalPoints: -1, rank: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await ScoreModel.countDocuments().exec();

    res.status(200).json({
      scores,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du classement" });
  }
});

// Récupérer le top 10 des utilisateurs
scoreRouter.get('/leaderboard/top', async (req, res): Promise<void> => {
  try {
    const topScores = await ScoreModel.find()
      .populate('user', 'firstname lastname email')
      .sort({ totalPoints: -1 })
      .limit(10)
      .exec();

    res.status(200).json(topScores);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du top 10" });
  }
});

// Créer un score pour un nouvel utilisateur
scoreRouter.post('/create', authMiddleware, async (req, res): Promise<void> => {
  try {
    const { user } = req.body;

    const existing = await ScoreModel.findOne({ user }).exec();
    if (existing) {
      res.status(400).json({ error: "Un score existe déjà pour cet utilisateur" });
      return;
    }

    const score = await ScoreModel.create({ user });
    res.status(201).json({ message: "Score créé", score });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du score" });
  }
});

// Ajouter des points
scoreRouter.patch('/:userId/addPoints', authMiddleware, async (req, res): Promise<void> => {
  try {
    const { points } = req.body;

    if (!points || points < 0) {
      res.status(400).json({ error: "Points invalides" });
      return;
    }

    const score = await ScoreModel.findOne({ user: req.params.userId }).exec();
    if (!score) {
      res.status(404).json({ error: "Score utilisateur non trouvé" });
      return;
    }

    score.totalPoints += points;
    await score.save();

    res.status(200).json({ message: "Points ajoutés", score });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout de points" });
  }
});

// Incrémenter le nombre de défis complétés
scoreRouter.patch('/:userId/completedChallenge', authMiddleware, async (req, res): Promise<void> => {
  try {
    const score = await ScoreModel.findOne({ user: req.params.userId }).exec();
    if (!score) {
      res.status(404).json({ error: "Score utilisateur non trouvé" });
      return;
    }

    score.challengesCompleted += 1;
    score.totalPoints += 50; // Bonus pour défi complété
    await score.save();

    res.status(200).json({ message: "Défi marqué comme complété", score });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du score" });
  }
});

// Ajouter un badge gagné
scoreRouter.patch('/:userId/earnedBadge', authMiddleware, async (req, res): Promise<void> => {
  try {
    const score = await ScoreModel.findOne({ user: req.params.userId }).exec();
    if (!score) {
      res.status(404).json({ error: "Score utilisateur non trouvé" });
      return;
    }

    score.badgesEarned += 1;
    score.totalPoints += 25; // Bonus pour badge gagné
    await score.save();

    res.status(200).json({ message: "Badge ajouté", score });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout du badge au score" });
  }
});

// Mettre à jour le rang de tous les utilisateurs
scoreRouter.patch('/admin/updateRanks', authMiddleware, async (req, res): Promise<void> => {
  try {
    const scores = await ScoreModel.find().sort({ totalPoints: -1 }).exec();
    
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      if (score) {
        score.rank = i + 1;
        await score.save();
      }
    }

    res.status(200).json({ message: "Rangs mis à jour", totalUsers: scores.length });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour des rangs" });
  }
});

export { scoreRouter };
