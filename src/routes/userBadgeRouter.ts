import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { createUserBadgeBody, CreateUserBadgeInput } from "../schemas";
import { UserBadgeModel } from "../models";

const userBadgeRouter = Router();

// Récupérer les badges d'un utilisateur
userBadgeRouter.get('/user/:userId', async (req, res): Promise<void> => {
  try {
    const badges = await UserBadgeModel.find({ user: req.params.userId })
      .populate('user', 'firstname lastname email')
      .populate('badge', 'name description iconUrl')
      .exec();
    res.status(200).json(badges);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des badges" });
  }
});

// Compter le nombre de badges d'un utilisateur
userBadgeRouter.get('/user/:userId/count', async (req, res): Promise<void> => {
  try {
    const count = await UserBadgeModel.countDocuments({ user: req.params.userId }).exec();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du comptage des badges" });
  }
});

// Attribuer un badge à un utilisateur (ADMIN uniquement)
userBadgeRouter.post('/assign', authMiddleware, roleMiddleware(["admin"]), validateMiddleware({ body: createUserBadgeBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateUserBadgeInput;
    
    // Vérifier si le badge existe déjà
    const existing = await UserBadgeModel.findOne({ user: input.user, badge: input.badge }).exec();
    if (existing) {
      res.status(400).json({ error: "Cet utilisateur possède déjà ce badge" });
      return;
    }

    const assigned = await UserBadgeModel.create(input);
    res.status(201).json({ message: "Badge attribué avec succès", userBadge: assigned });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'attribution du badge" });
  }
});

// Retirer un badge d'un utilisateur (ADMIN uniquement)
userBadgeRouter.delete('/:id', authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
  try {
    const deleted = await UserBadgeModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Badge utilisateur non trouvé" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression du badge" });
  }
});

export { userBadgeRouter };
