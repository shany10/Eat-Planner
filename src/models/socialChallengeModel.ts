import { Schema, model, Document, Types } from "mongoose";

export interface ISocialChallenge extends Document {
  challenge: Types.ObjectId;
  inviter: Types.ObjectId;
  invitee: Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "completed";
  invitedAt: Date;
  respondedAt?: Date;
  created_at: Date;
  updated_at: Date;
}

const socialChallengeSchema = new Schema<ISocialChallenge>({
  challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
  inviter: { type: Schema.Types.ObjectId, ref: "User", required: true },
  invitee: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending" },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, optional: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const SocialChallengeModel = model<ISocialChallenge>("SocialChallenge", socialChallengeSchema);
