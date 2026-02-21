import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

		title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },

		// Simple, measurable goal: keep emissions <= maxKg within [start, end]
		maxKg: { type: Number, required: true, min: 0 },
		startDate: { type: Date, required: true, index: true },
		endDate: { type: Date, required: true, index: true },

		status: { type: String, enum: ["active", "achieved", "failed"], default: "active", index: true },

		alertsEnabled: { type: Boolean, default: true },
		alertEmail: { type: String, trim: true, lowercase: true },
		lastAlertAt: { type: Date },
	},
	{ timestamps: true }
);

goalSchema.index({ userId: 1, status: 1, startDate: -1 });

export const Goal = mongoose.model("Goal", goalSchema);
