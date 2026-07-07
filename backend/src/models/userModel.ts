import { Schema, model, Document } from "mongoose";
import argon2 from "argon2";

export interface IUser extends Document {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  authProvider: "local" | "google";
  providerId?: string;
  role: "admin" | "manager" | "employee" | "supplier";
  active: boolean;
  restaurantName: string;
  defaultMarginRate: number;
  vatRate: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorTempSecret?: string | null;
  passwordResetTokenHash?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  created_at: Date;
  updated_at: Date;
  verifyPassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  authProvider: { type: String, enum: ["local", "google"], default: "local", required: true },
  providerId: { type: String, sparse: true },
  role: { type: String, enum: ["admin", "manager", "employee", "supplier"], default: "manager", required: true },
  active: { type: Boolean, default: true },
  restaurantName: { type: String, trim: true, default: "Mon restaurant" },
  defaultMarginRate: { type: Number, min: 0, max: 0.95, default: 0.72 },
  vatRate: { type: Number, min: 0, max: 1, default: 0.1 },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null, select: false },
  twoFactorTempSecret: { type: String, default: null, select: false },
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetTokenExpiresAt: { type: Date, default: null, select: false }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return;
  this.password = await argon2.hash(this.password);
});

userSchema.methods.verifyPassword = async function (candidate: string) {
  if (!this.password) return false;
  return argon2.verify(this.password, candidate);
};

export const UserModel = model<IUser>("User", userSchema);
