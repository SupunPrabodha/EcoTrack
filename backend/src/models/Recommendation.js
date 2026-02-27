import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    impact: { type: String, trim: true, maxlength: 32 },
    context: { type: mongoose.Schema.Types.Mixed },
    evidence: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, createdAt: -1 });

export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
