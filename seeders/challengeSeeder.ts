import { ChallengeModel } from "../src/models";

export const challengeSeeder = async (users: any[], exerciseTypes: any[], gyms: any[]) => {
  const creators = users.filter(u => u.role === "admin" || u.role === "manager");
  const members = users.filter(u => u.role === "member");
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const challenges = [
    {
      title: "Défi Push-ups 100",
      description: "Réalisez 100 push-ups en une séance",
      creator: creators[0]._id,
      exerciseType: exerciseTypes.find((e: any) => e.name === "Push-ups")?._id || exerciseTypes[0]._id,
      difficulty: "beginner",
      duration: 7,
      objectives: "Atteindre 100 push-ups en une seule série ou réparties en plusieurs séries",
      participants: [members[0]._id, members[1]._id],
      gym: gyms[0]._id,
      startDate: now,
      endDate: nextWeek
    },
    {
      title: "30 Jours de Squats",
      description: "Programme progressif de squats sur 30 jours",
      creator: creators[0]._id,
      exerciseType: exerciseTypes.find((e: any) => e.name === "Squats")?._id || exerciseTypes[1]._id,
      difficulty: "beginner",
      duration: 30,
      objectives: "Commencer avec 20 squats et atteindre 100 squats à la fin du mois",
      participants: members.map((m: any) => m._id),
      gym: gyms[0]._id,
      startDate: now,
      endDate: nextMonth
    },
    {
      title: "Pull-ups Master",
      description: "Progressez jusqu'à 10 tractions consécutives",
      creator: creators.length > 1 ? creators[1]._id : creators[0]._id,
      exerciseType: exerciseTypes.find((e: any) => e.name === "Pull-ups")?._id || exerciseTypes[2]._id,
      difficulty: "intermediate",
      duration: 21,
      objectives: "Passer de 0 à 10 tractions strictes en 3 semaines",
      participants: [members[1]._id, members[2]._id],
      gym: gyms[1]._id,
      startDate: now,
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
    },
    {
      title: "Plank Challenge",
      description: "Tenir 5 minutes de planche",
      creator: creators[0]._id,
      exerciseType: exerciseTypes.find((e: any) => e.name === "Plank")?._id || exerciseTypes[5]._id,
      difficulty: "beginner",
      duration: 14,
      objectives: "Progresser de 30 secondes à 5 minutes de gainage",
      participants: [members[0]._id, members[2]._id],
      gym: gyms[2]._id,
      startDate: now,
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    },
    {
      title: "Burpees Inferno",
      description: "100 burpees en moins de 10 minutes",
      creator: creators[0]._id,
      exerciseType: exerciseTypes.find((e: any) => e.name === "Burpees")?._id || exerciseTypes[7]._id,
      difficulty: "advanced",
      duration: 7,
      objectives: "Compléter 100 burpees avec une bonne technique en moins de 10 minutes",
      participants: [members[1]._id],
      gym: gyms[1]._id,
      startDate: now,
      endDate: nextWeek
    }
  ];

  console.log("🌱 Seeding challenges...");
  const createdChallenges = await ChallengeModel.insertMany(challenges);
  console.log(`✅ ${createdChallenges.length} challenges created`);
  
  return createdChallenges;
};
