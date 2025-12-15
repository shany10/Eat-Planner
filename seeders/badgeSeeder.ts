import { BadgeModel } from "../src/models";

export const badgeSeeder = async () => {
  const badges = [
    {
      name: "Première Séance",
      description: "Complétez votre première séance d'entraînement",
      iconUrl: "/badges/first-session.svg"
    },
    {
      name: "Marathonien",
      description: "Participez à 50 séances d'entraînement",
      iconUrl: "/badges/marathoner.svg"
    },
    {
      name: "Débutant Déterminé",
      description: "Complétez 10 séances en tant que débutant",
      iconUrl: "/badges/beginner.svg"
    },
    {
      name: "Champion Intermédiaire",
      description: "Atteignez le niveau intermédiaire dans 3 exercices",
      iconUrl: "/badges/intermediate-champ.svg"
    },
    {
      name: "Expert Avancé",
      description: "Maîtrisez 5 exercices de niveau avancé",
      iconUrl: "/badges/advanced-expert.svg"
    },
    {
      name: "Social Butterfly",
      description: "Participez à 10 défis sociaux",
      iconUrl: "/badges/social.svg"
    },
    {
      name: "Roi du Cardio",
      description: "Cumulez 100 heures d'exercices cardio",
      iconUrl: "/badges/cardio-king.svg"
    },
    {
      name: "Force Brute",
      description: "Soulevez un total de 10 tonnes",
      iconUrl: "/badges/brute-force.svg"
    },
    {
      name: "Régularité",
      description: "Entraînez-vous 30 jours consécutifs",
      iconUrl: "/badges/consistency.svg"
    },
    {
      name: "Légende",
      description: "Atteignez tous les objectifs et débloquez tous les badges",
      iconUrl: "/badges/legend.svg"
    }
  ];

  console.log("🌱 Seeding badges...");
  const createdBadges = await BadgeModel.insertMany(badges);
  console.log(`✅ ${createdBadges.length} badges created`);
  
  return createdBadges;
};
