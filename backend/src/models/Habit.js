import mongoose from "mongoose";
import { HABIT_TYPES } from "../utils/constants.js";

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: HABIT_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    emissionKg: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, date: 1, type: 1 }, { unique: true });
 
export const Habit = mongoose.model("Habit", habitSchema);
