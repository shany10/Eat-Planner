import { Schema, model, Document, Types } from "mongoose";

export interface ISocialChallenge extends Document {
    challenge: Types.ObjectId;
    inviter: Types.ObjectId;
    invitee: Types.ObjectId;
    status: "pending" | "accepted" | "declined" | "completed";
}

const socialSchema = new Schema<ISocialChallenge>({
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    inviter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invitee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending" }
}, { timestamps: true });

export const SocialChallengeModel = model<ISocialChallenge>("SocialChallenge", socialSchema);