import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    maxKg: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function (v) {
          return this.startDate && v > this.startDate;
        },
        message: "endDate must be after startDate",
      },
    },
    status: {
      type: String,
      enum: ["active", "achieved", "failed"],
      default: "active",
      index: true,
    },
    period: { 
      type: String, 
      enum: ["weekly", "monthly", "custom"], 
      default: "weekly", 
    },
    alertsEnabled: {
      type: Boolean,
      default: true,
    },
    alertEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    lastAlertAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1, startDate: -1 });

export const Goal = mongoose.model("Goal", goalSchema);
