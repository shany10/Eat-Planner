import { BadgeRuleModel } from "../src/models";

export const badgeRuleSeeder = async () => {
    try {
        console.log('Seeding badge rules...');

        const existingRules = await BadgeRuleModel.countDocuments();
        if (existingRules > 0) {
            console.log('Badge rules already exist. Skipping seeding.');
            return;
        }

        const rules = [
            {
                badgeName: "Première Séance",
                conditionType: "completedTrainings",
                conditionField: "completedTrainings",
                operator: ">=",
                value: 1,
                isActive: true
            },
            {
                badgeName: "Débutant Déterminé",
                conditionType: "completedTrainings",
                conditionField: "completedTrainings",
                operator: ">=",
                value: 10,
                isActive: true
            },
            {
                badgeName: "Régularité",
                conditionType: "completedTrainings",
                conditionField: "completedTrainings",
                operator: ">=",
                value: 30,
                isActive: true
            },
            {
                badgeName: "Marathonien",
                conditionType: "completedTrainings",
                conditionField: "completedTrainings",
                operator: ">=",
                value: 50,
                isActive: true
            },
            {
                badgeName: "Expert Avancé",
                conditionType: "totalPoints",
                conditionField: "totalPoints",
                operator: ">=",
                value: 1000,
                isActive: true
            },
            {
                badgeName: "Champion Intermédiaire",
                conditionType: "totalPoints",
                conditionField: "totalPoints",
                operator: ">=",
                value: 5000,
                isActive: true
            },
            {
                badgeName: "Roi du Cardio",
                conditionType: "totalPoints",
                conditionField: "totalPoints",
                operator: ">=",
                value: 10000,
                isActive: true
            }
        ];

        await BadgeRuleModel.insertMany(rules);
        console.log(`Successfully seeded ${rules.length} badge rules`);
    } catch (error) {
        console.error('Error seeding badge rules:', error);
        throw error;
    }
};
