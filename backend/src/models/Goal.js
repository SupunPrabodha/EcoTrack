import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		title: { type: String, required: true, trim: true, maxlength: 140 },
		targetKg: { type: Number, required: true, min: 0 },
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true },
	},
	{ timestamps: true }
);

goalSchema.index({ userId: 1, endDate: -1 });

export const Goal = mongoose.model("Goal", goalSchema);

