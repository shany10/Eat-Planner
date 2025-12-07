import { Schema, model, Document, Types } from "mongoose";

export interface IScore extends Document {
  user: Types.ObjectId;
  totalPoints: number;
  challengesCompleted: number;
  badgesEarned: number;
  rank: number;
  created_at: Date;
  updated_at: Date;
}

const scoreSchema = new Schema<IScore>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  totalPoints: { type: Number, default: 0, min: 0 },
  challengesCompleted: { type: Number, default: 0, min: 0 },
  badgesEarned: { type: Number, default: 0, min: 0 },
  rank: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const ScoreModel = model<IScore>("Score", scoreSchema);
