import { Schema, model, Document, Types } from "mongoose";

export interface ITrainingStat extends Document {
    user: Types.ObjectId;
    challenge: Types.ObjectId;
    sessionDate: Date;
    duration: number;
    caloriesBurned: number;
    notes?: string;
    completed: boolean;
    created_at: Date;
    updated_at: Date;
}

const trainingStatSchema = new Schema<ITrainingStat>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    sessionDate: { type: Date, required: true },
    duration: { type: Number, required: true, min: 1 },
    caloriesBurned: { type: Number, required: true, min: 0 },
    notes: { type: String },
    completed: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: true
});

export const TrainingStatModel = model<ITrainingStat>("TrainingStat", trainingStatSchema);