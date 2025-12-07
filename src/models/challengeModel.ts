import { Schema, model, Document, Types } from "mongoose";

export interface IChallenge extends Document {
  title: string;
  description: string;
  creator: Types.ObjectId;
  exerciseType: Types.ObjectId;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: number; // en jours
  objectives: string;
  participants: Types.ObjectId[];
  gym?: Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
  exerciseType: { type: Schema.Types.ObjectId, ref: "ExerciseType", required: true },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
  duration: { type: Number, required: true, min: 1 }, // nombre de jours
  objectives: { type: String, required: true },
  participants: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  gym: { type: Schema.Types.ObjectId, ref: "Gym", optional: true },
  startDate: { type: Date, optional: true },
  endDate: { type: Date, optional: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const ChallengeModel = model<IChallenge>("Challenge", challengeSchema);
