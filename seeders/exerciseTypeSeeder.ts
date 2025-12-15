import { ExerciseTypeModel } from "../src/models";

export const exerciseTypeSeeder = async () => {
  const exerciseTypes = [
    {
      name: "Push-ups",
      description: "Exercice de musculation polyvalent pour le haut du corps",
      targetedMuscles: ["pectoraux", "triceps", "épaules"],
      difficulty: "beginner"
    },
    {
      name: "Squats",
      description: "Exercice fondamental pour renforcer les jambes et les fessiers",
      targetedMuscles: ["quadriceps", "fessiers", "ischio-jambiers"],
      difficulty: "beginner"
    },
    {
      name: "Pull-ups",
      description: "Exercice de traction pour le dos et les bras",
      targetedMuscles: ["dorsaux", "biceps", "trapèzes"],
      difficulty: "intermediate"
    },
    {
      name: "Deadlift",
      description: "Soulevé de terre pour le renforcement global",
      targetedMuscles: ["dorsaux", "fessiers", "ischio-jambiers", "trapèzes"],
      difficulty: "advanced"
    },
    {
      name: "Bench Press",
      description: "Développé couché pour les pectoraux",
      targetedMuscles: ["pectoraux", "triceps", "épaules"],
      difficulty: "intermediate"
    },
    {
      name: "Plank",
      description: "Exercice de gainage pour renforcer le core",
      targetedMuscles: ["abdominaux", "obliques", "lombaires"],
      difficulty: "beginner"
    },
    {
      name: "Lunges",
      description: "Fentes pour travailler les jambes de manière unilatérale",
      targetedMuscles: ["quadriceps", "fessiers", "ischio-jambiers"],
      difficulty: "beginner"
    },
    {
      name: "Burpees",
      description: "Exercice cardio complet pour tout le corps",
      targetedMuscles: ["tout le corps"],
      difficulty: "advanced"
    },
    {
      name: "Dips",
      description: "Exercice aux barres parallèles pour triceps et pectoraux",
      targetedMuscles: ["triceps", "pectoraux", "épaules"],
      difficulty: "intermediate"
    },
    {
      name: "Box Jumps",
      description: "Sauts sur box pour la puissance explosive",
      targetedMuscles: ["quadriceps", "fessiers", "mollets"],
      difficulty: "intermediate"
    }
  ];

  console.log("🌱 Seeding exercise types...");
  const createdExerciseTypes = await ExerciseTypeModel.insertMany(exerciseTypes);
  console.log(`✅ ${createdExerciseTypes.length} exercise types created`);
  
  return createdExerciseTypes;
};
