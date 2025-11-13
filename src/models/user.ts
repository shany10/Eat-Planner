import { Schema, model, Document } from "mongoose";
import argon2 from "argon2";

export interface IUser extends Document {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  statu: "admin" | "manager";
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  statu: { type: String, enum: ["admin", "manager"], required: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

// Hash password before save if it's new or modified
userSchema.pre("save", async function (this: any) {
  if (!this.isModified || !this.isModified("password")) return;
  this.password = await argon2.hash(this.password);
});

// Instance method to verify a password
userSchema.methods.verifyPassword = async function (candidate: string) {
  return argon2.verify(this.password, candidate);
};

export const User = model<IUser>("User", userSchema);