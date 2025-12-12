import { UserBadgeModel, TrainingStatModel, BadgeModel, ScoreModel } from "../models";

export class BadgeService {

    static async checkAndAwardAllBadges(userId: string) {
        try {
            // Règle 1 : Badge "Premier Pas" (1er entraînement terminé)
            const statsCount = await TrainingStatModel.countDocuments({ user: userId, completed: true });
            if (statsCount >= 1) {
                await this.awardBadge(userId, "Premier Pas");
            }

            // Règle 2 : Badge "Acharné" (10 entraînements terminés)
            if (statsCount >= 10) {
                await this.awardBadge(userId, "Acharné");
            }

            // Règle 3 : Badge "Expert" (1000 points accumulés)
            const score = await ScoreModel.findOne({ user: userId });
            if (score && score.totalPoints >= 1000) {
                await this.awardBadge(userId, "Expert");
            }
        } catch (error) {
            console.error("Erreur lors de l'attribution des badges :", error);
        }
    }

    // Méthode privée pour éviter la duplication de code
    private static async awardBadge(userId: string, badgeName: string) {
        // On cherche le badge dans la base (il doit avoir été créé par l'admin au préalable)
        const badge = await BadgeModel.findOne({ name: badgeName });
        
        if (badge) {
            // On vérifie si l'utilisateur l'a déjà pour ne pas lui donner deux fois
            const exists = await UserBadgeModel.findOne({ user: userId, badge: badge._id });
            
            if (!exists) {
                await UserBadgeModel.create({ user: userId, badge: badge._id });
                console.log(`Badge ${badgeName} attribué à l'utilisateur ${userId}`);
            }
        }
    }
    
    // Récupérer les badges d'un utilisateur
    static async getUserBadgesWithRules(userId: string) {
        return UserBadgeModel.find({ user: userId }).populate("badge");
    }
}