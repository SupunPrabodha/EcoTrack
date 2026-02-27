import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Habit } from "../models/Habit.js";

function toObjectId(id) {
	return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

export const listEmissionsCtrl = asyncHandler(async (req, res) => {
	const page = Math.max(1, Number(req.validated.query.page ?? 1));
	const limit = Math.min(50, Math.max(1, Number(req.validated.query.limit ?? 10)));
	const skip = (page - 1) * limit;

	// Minimal implementation: expose Habit entries as emissions for dashboard/recent activity.
	const filter = { userId: toObjectId(req.user.userId) };

	const [items, total] = await Promise.all([
		Habit.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
		Habit.countDocuments(filter),
	]);

	const mapped = items.map((h) => ({
		_id: h._id,
		sourceType: "habit",
		habitType: h.type,
		value: h.value,
		emissionKg: h.emissionKg,
		date: h.date,
		calculationMethod: "local_factor",
	}));

	res.json({
		success: true,
		data: {
			items: mapped,
			total,
			page,
			limit,
			pages: Math.max(1, Math.ceil(total / limit)),
		},
	});
});

export const summaryCtrl = asyncHandler(async (req, res) => {
	const { from, to } = req.validated.query;
	const fromDate = new Date(from);
	const toDate = new Date(to);

	const userId = toObjectId(req.user.userId);

	const rows = await Habit.aggregate([
		{ $match: { userId, date: { $gte: fromDate, $lte: toDate } } },
		{
			$group: {
				_id: "$type",
				totalKg: { $sum: "$emissionKg" },
				count: { $sum: 1 },
			},
		},
		{ $sort: { totalKg: -1 } },
	]);

	const totalKg = rows.reduce((sum, r) => sum + Number(r.totalKg || 0), 0);
	const count = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);

	res.json({
		success: true,
		data: {
			totalKg,
			count,
			byType: rows,
			gridIntensityGPerKwh: null,
		},
	});
});

export const trendsCtrl = asyncHandler(async (req, res) => {
	const { from, to } = req.validated.query;
	const fromDate = new Date(from);
	const toDate = new Date(to);

	const userId = toObjectId(req.user.userId);

	const rows = await Habit.aggregate([
		{ $match: { userId, date: { $gte: fromDate, $lte: toDate } } },
		{
			$group: {
				_id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
				totalKg: { $sum: "$emissionKg" },
			},
		},
		{ $sort: { _id: 1 } },
	]);

	res.json({ success: true, data: rows });
});

export const emissionsQuerySchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}).optional(),
	query: z.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
	}),
});

export const rangeSchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}).optional(),
	query: z.object({
		from: z.string().datetime(),
		to: z.string().datetime(),
	}),
});

