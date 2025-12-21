import { RewardModel, UserRewardModel, ScoreModel } from "../models";
import { Types } from "mongoose";

export class RewardService {
    
    /**
     * Attribue les récompenses appropriées après complétion d'un défi standard
     */
    static async awardForChallengeComplete(
        userId: string | Types.ObjectId,
        challengeId: string | Types.ObjectId,
        difficulty: "beginner" | "intermediate" | "advanced"
    ): Promise<void> {
        try {
            // Trouver les récompenses actives pour complétion de défi
            const rewards = await RewardModel.find({
                isActive: true,
                conditionType: "challengeComplete",
                $or: [
                    { conditionDifficulty: difficulty },
                    { conditionDifficulty: { $exists: false } },
                    { conditionDifficulty: null }
                ]
            }).exec();

            for (const reward of rewards) {
                await this.grantReward(
                    userId, 
                    reward._id as Types.ObjectId, 
                    "challenge", 
                    challengeId
                );
            }

            // Vérifier aussi les récompenses basées sur les points
            await this.checkPointsRewards(userId);
        } catch (error) {
            console.error("Erreur lors de l'attribution des récompenses (challenge):", error);
        }
    }

    /**
     * Attribue les récompenses appropriées après complétion d'un défi social
     */
    static async awardForSocialComplete(
        userId: string | Types.ObjectId,
        socialChallengeId: string | Types.ObjectId,
        difficulty: "beginner" | "intermediate" | "advanced"
    ): Promise<void> {
        try {
            // Trouver les récompenses actives pour complétion de défi social
            const rewards = await RewardModel.find({
                isActive: true,
                conditionType: "socialComplete",
                $or: [
                    { conditionDifficulty: difficulty },
                    { conditionDifficulty: { $exists: false } },
                    { conditionDifficulty: null }
                ]
            }).exec();

            for (const reward of rewards) {
                await this.grantReward(
                    userId, 
                    reward._id as Types.ObjectId, 
                    "socialChallenge", 
                    socialChallengeId
                );
            }

            // Vérifier aussi les récompenses basées sur les points
            await this.checkPointsRewards(userId);
        } catch (error) {
            console.error("Erreur lors de l'attribution des récompenses (social):", error);
        }
    }

    /**
     * Vérifie et attribue les récompenses basées sur le seuil de points
     */
    static async checkPointsRewards(userId: string | Types.ObjectId): Promise<void> {
        try {
            const score = await ScoreModel.findOne({ user: userId }).exec();
            if (!score) return;

            const rewards = await RewardModel.find({
                isActive: true,
                conditionType: "pointsThreshold",
                conditionValue: { $lte: score.totalPoints }
            }).exec();

            for (const reward of rewards) {
                await this.grantReward(
                    userId, 
                    reward._id as Types.ObjectId, 
                    "points",
                    undefined
                );
            }
        } catch (error) {
            console.error("Erreur lors de la vérification des récompenses points:", error);
        }
    }

    /**
     * Attribution manuelle d'une récompense par un admin
     */
    static async awardManually(
        userId: string,
        rewardId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const reward = await RewardModel.findById(rewardId).exec();
            if (!reward) {
                return { success: false, message: "Récompense non trouvée" };
            }

            const result = await this.grantReward(userId, rewardId, "manual", undefined);
            return result;
        } catch (error) {
            console.error("Erreur lors de l'attribution manuelle:", error);
            return { success: false, message: "Erreur lors de l'attribution" };
        }
    }

    /**
     * Fonction interne pour attribuer une récompense (évite les doublons)
     */
    private static async grantReward(
        userId: string | Types.ObjectId,
        rewardId: string | Types.ObjectId,
        sourceType: "challenge" | "socialChallenge" | "points" | "manual",
        sourceId: string | Types.ObjectId | undefined
    ): Promise<{ success: boolean; message: string }> {
        try {
            const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
            const rewardObjectId = typeof rewardId === 'string' ? new Types.ObjectId(rewardId) : rewardId;
            const sourceObjectId = sourceId 
                ? (typeof sourceId === 'string' ? new Types.ObjectId(sourceId) : sourceId) 
                : undefined;

            // Vérifier si déjà attribuée (pour points et manual, on vérifie juste user+reward)
            const existingQuery: Record<string, unknown> = { 
                user: userObjectId, 
                reward: rewardObjectId 
            };
            if (sourceObjectId) {
                existingQuery.sourceId = sourceObjectId;
            }

            const existing = await UserRewardModel.findOne(existingQuery).exec();
            if (existing) {
                return { success: false, message: "Récompense déjà attribuée" };
            }

            // Pour les récompenses basées sur les points, vérifier sans sourceId
            if (sourceType === "points") {
                const existingPoints = await UserRewardModel.findOne({
                    user: userObjectId,
                    reward: rewardObjectId,
                    sourceType: "points"
                }).exec();
                if (existingPoints) {
                    return { success: false, message: "Récompense déjà attribuée" };
                }
            }

            await UserRewardModel.create({
                user: userObjectId,
                reward: rewardObjectId,
                sourceType,
                sourceId: sourceObjectId
            });

            const reward = await RewardModel.findById(rewardObjectId).exec();
            console.log(`Récompense "${reward?.name}" attribuée à l'utilisateur ${userId}`);
            
            return { success: true, message: `Récompense "${reward?.name}" attribuée` };
        } catch (error: unknown) {
            // Ignorer les erreurs de doublon
            if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
                return { success: false, message: "Récompense déjà attribuée" };
            }
            throw error;
        }
    }

    /**
     * Récupérer les récompenses d'un utilisateur
     */
    static async getUserRewards(userId: string) {
        return UserRewardModel.find({ user: userId })
            .populate('reward')
            .sort({ earnedAt: -1 })
            .exec();
    }
}