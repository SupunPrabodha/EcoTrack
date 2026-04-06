import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ROLES } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    preferences: {
      diet: { type: String, enum: ["omnivore", "vegetarian", "vegan"], default: undefined },
      transportMode: { type: String, enum: ["car", "public", "mixed", "bike", "walk", "remote"], default: undefined },
      recommendations: {
        excludedRuleIds: [{ type: String, trim: true, maxlength: 80 }],
      },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
