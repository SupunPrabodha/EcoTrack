import mongoose from "mongoose";
import { HABIT_TYPES } from "../utils/constants.js";

const emissionEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Link back to habit when derived from habit logging
    habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit" },

    sourceType: { type: String, enum: ["habit", "manual"], required: true },

    habitType: { type: String, enum: HABIT_TYPES },
    value: { type: Number, min: 0 },

    emissionKg: { type: Number, required: true, min: 0 },
    calculationMethod: {
      type: String,
      enum: ["carbon_interface", "grid_intensity", "local_factor", "invalid_input", "unknown_type"],
      default: "local_factor",
    },

    region: { type: String },
    notes: { type: String, trim: true },

    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// If an entry is derived from a habit, keep 1:1 mapping.
emissionEntrySchema.index(
  { habitId: 1 },
  {
    unique: true,
    partialFilterExpression: { habitId: { $type: "objectId" } },
  }
);

export const EmissionEntry = mongoose.model("EmissionEntry", emissionEntrySchema);
