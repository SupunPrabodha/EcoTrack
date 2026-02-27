import mongoose from "mongoose";
import { Goal } from "../models/Goal.js";
import { ApiError } from "../utils/ApiError.js";

function toObjectId(id) {
	return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export async function createGoal({ userId, title, targetKg, startDate, endDate }) {
	return Goal.create({
		userId: toObjectId(userId),
		title,
		targetKg: Number(targetKg),
		startDate,
		endDate,
	});
}

export async function listGoals({ userId, page, limit }) {
	const safePage = Math.max(1, Number(page || 1));
	const safeLimit = Math.min(50, Math.max(1, Number(limit || 10)));
	const skip = (safePage - 1) * safeLimit;

	const filter = { userId: toObjectId(userId) };
	const [items, total] = await Promise.all([
		Goal.find(filter).sort({ endDate: -1, createdAt: -1 }).skip(skip).limit(safeLimit),
		Goal.countDocuments(filter),
	]);

	return { items, total, page: safePage, limit: safeLimit, pages: Math.max(1, Math.ceil(total / safeLimit)) };
}

export async function updateGoal({ userId, id, patch }) {
	const updated = await Goal.findOneAndUpdate(
		{ _id: id, userId: toObjectId(userId) },
		patch,
		{ new: true }
	);
	if (!updated) throw new ApiError(404, "Goal not found");
	return updated;
}

export async function deleteGoal({ userId, id }) {
	const deleted = await Goal.findOneAndDelete({ _id: id, userId: toObjectId(userId) });
	if (!deleted) throw new ApiError(404, "Goal not found");
	return deleted;
}

