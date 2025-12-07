import { Schema, model, Document } from "mongoose";

export interface IExerciseType extends Document {
  name: string;
  description: string;
  targetedMuscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  created_at: Date;
  updated_at: Date;
}

const exerciseTypeSchema = new Schema<IExerciseType>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  targetedMuscles: { type: [String], default: [] },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const ExerciseTypeModel = model<IExerciseType>("ExerciseType", exerciseTypeSchema);
