import { Schema, model, Document, Types } from "mongoose";

export interface IUserBadge extends Document {
  user: Types.ObjectId;
  badge: Types.ObjectId;
  earnedAt: Date;
  reason?: string;
  created_at: Date;
  updated_at: Date;
}

const userBadgeSchema = new Schema<IUserBadge>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  badge: { type: Schema.Types.ObjectId, ref: "Badge", required: true },
  earnedAt: { type: Date, default: Date.now },
  reason: { type: String, optional: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const UserBadgeModel = model<IUserBadge>("UserBadge", userBadgeSchema);
