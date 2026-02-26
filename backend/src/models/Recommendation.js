import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    impact: { type: String, enum: ["Low", "Medium", "High", "Positive"], default: "Low" },

    // Context that influenced the suggestion (for rubric: third-party API drives business logic)
    context: {
      weather: {
        city: String,
        condition: String,
        tempC: Number,
      },
      range: {
        from: Date,
        to: Date,
      },
    },

    // Explainability metadata for modern UX (optional)
    evidence: {
      why: [{ type: String, trim: true, maxlength: 200 }],
      habits: {
        car_km: { totalValue: Number, totalKg: Number },
        electricity_kwh: { totalValue: Number, totalKg: Number },
        meat_meals: { totalValue: Number, totalKg: Number },
      },
      weather: {
        city: String,
        condition: String,
        tempC: Number,
      },
      range: {
        from: Date,
        to: Date,
      },
    },

    saved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, createdAt: -1 });

export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
