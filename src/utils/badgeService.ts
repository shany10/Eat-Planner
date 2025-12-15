import { UserBadgeModel, TrainingStatModel, BadgeModel, ScoreModel, BadgeRuleModel } from "../models";

export class BadgeService {

    static async checkAndAwardAllBadges(userId: string) {
        try {
            const activeRules = await BadgeRuleModel.find({ isActive: true }).exec();

            const statsCount = await TrainingStatModel.countDocuments({ user: userId, completed: true });
            const score = await ScoreModel.findOne({ user: userId });

            for (const rule of activeRules) {
                const shouldAward = await this.evaluateRule(rule, {
                    completedTrainings: statsCount,
                    totalPoints: score?.totalPoints || 0,
                    userId
                });

                if (shouldAward) {
                    await this.awardBadge(userId, rule.badgeName);
                }
            }
        } catch (error) {
            console.error("Error awarding badges:", error);
        }
    }

    private static async evaluateRule(rule: any, userData: any): Promise<boolean> {
        try {
            const { conditionType, conditionField, operator, value, customCondition } = rule;

            if (customCondition) {
                return this.evaluateCustomCondition(customCondition, userData);
            }

            const fieldValue = userData[conditionField];
            if (fieldValue === undefined) {
                return false;
            }

            switch (operator) {
                case ">=":
                    return fieldValue >= value;
                case ">":
                    return fieldValue > value;
                case "=":
                    return fieldValue === value;
                case "<":
                    return fieldValue < value;
                case "<=":
                    return fieldValue <= value;
                default:
                    return false;
            }
        } catch (error) {
            console.error("Error evaluating rule:", error);
            return false;
        }
    }

    private static evaluateCustomCondition(condition: string, userData: any): boolean {
        try {
            let evaluableCondition = condition;
            for (const [key, value] of Object.entries(userData)) {
                evaluableCondition = evaluableCondition.replace(new RegExp(key, 'g'), String(value));
            }

            return eval(evaluableCondition);
        } catch (error) {
            console.error("Error evaluating custom condition:", error);
            return false;
        }
    }

    private static async awardBadge(userId: string, badgeName: string) {
        const badge = await BadgeModel.findOne({ name: badgeName });
        
        if (badge) {
            const exists = await UserBadgeModel.findOne({ user: userId, badge: badge._id });
            
            if (!exists) {
                await UserBadgeModel.create({ user: userId, badge: badge._id });
                console.log(`Badge ${badgeName} awarded to user ${userId}`);
            }
        }
    }
    
    static async getUserBadgesWithRules(userId: string) {
        return UserBadgeModel.find({ user: userId }).populate("badge");
    }
}