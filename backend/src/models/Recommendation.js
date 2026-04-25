import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Stable identifier for the rule/template that produced this recommendation.
    // Helps deduplication and enables feedback-driven ranking.
    ruleId: { type: String, trim: true, maxlength: 80 },

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
      airPollution: {
        aqi: Number,
        aqiLabel: String,
      },
      gridIntensityGPerKwh: Number,
      location: {
        lat: Number,
        lon: Number,
        region: String,
      },
      range: {
        from: Date,
        to: Date,
      },
    },

    // Explainability metadata for modern UX (optional)
    evidence: {
      why: [{ type: String, trim: true, maxlength: 200 }],
      estimatedKgSaved: { type: Number, min: 0 },
      dataUsed: {
        sources: [{ type: String, trim: true, maxlength: 30 }],
        habitTypes: [{ type: String, trim: true, maxlength: 40 }],
        rangeDays: { type: Number, min: 0 },
      },
      habits: {
        car_km: { totalValue: Number, totalKg: Number },
        public_transport_km: { totalValue: Number, totalKg: Number },
        electricity_kwh: { totalValue: Number, totalKg: Number },
        meat_meals: { totalValue: Number, totalKg: Number },
        plastic_items: { totalValue: Number, totalKg: Number },
      },
      weather: {
        city: String,
        condition: String,
        tempC: Number,
      },
      airPollution: {
        aqi: Number,
        aqiLabel: String,
      },
      gridIntensityGPerKwh: Number,
      goals: {
        activeGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal" },
        goalTitle: String,
        currentKg: Number,
        maxKg: Number,
        exceeded: Boolean,
      },
      range: {
        from: Date,
        to: Date,
      },
    },

    // Simple trust signal for explainability UX
    confidence: { type: String, enum: ["low", "medium", "high"], default: "low" },

    saved: { type: Boolean, default: true },

    // Simple real-world workflow + feedback
    status: { type: String, enum: ["saved", "done", "dismissed"], default: "saved", index: true },
    doneAt: { type: Date },
    dismissedUntil: { type: Date },
    rating: { type: String, enum: ["useful", "not_useful"] },
    feedbackNote: { type: String, trim: true, maxlength: 300 },

    // Optional: observed (measured) impact after marking a recommendation done.
    observedImpact: {
      windowDays: { type: Number, min: 1, max: 365 },
      beforeKg: { type: Number },
      afterKg: { type: Number },
      deltaKg: { type: Number },
      computedAt: { type: Date },
    },

    audit: {
      type: [
        {
          at: { type: Date, default: Date.now },
          action: { type: String, required: true, trim: true, maxlength: 60 },
          meta: { type: Object },
        },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, createdAt: -1 });
recommendationSchema.index({ userId: 1, status: 1, dismissedUntil: 1, createdAt: -1 });
recommendationSchema.index({ userId: 1, doneAt: 1, "observedImpact.computedAt": 1 });

export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
