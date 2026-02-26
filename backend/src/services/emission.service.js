import mongoose from "mongoose";
import { EMISSION_FACTORS } from "../utils/constants.js";
import { estimateCarbonInterfaceKg, getGridCarbonIntensity } from "./thirdparty.service.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

function round3(n) {
	return Math.round(n * 1000) / 1000;
}

function toObjectIdIfPossible(id) {
	if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
	return id;
}

export async function calculateEmission({ habitType, value, date, region }) {
	if (typeof value !== "number" || value < 0) {
		return { emissionKg: 0, method: "invalid_input" };
	}

	// 1) Carbon Interface (best-effort, only for supported types)
	const ciKg = await estimateCarbonInterfaceKg({ habitType, value, date });
	if (typeof ciKg === "number" && ciKg >= 0) {
		return { emissionKg: round3(ciKg), method: "carbon_interface" };
	}

	// 2) Carbon Intensity (meaningful for electricity)
	if (habitType === "electricity_kwh") {
		const intensity = await getGridCarbonIntensity({ region }); // gCO2/kWh
		if (typeof intensity === "number" && intensity > 0) {
			const kg = (value * intensity) / 1000;
			return { emissionKg: round3(kg), method: "grid_intensity" };
		}
	}

	// 3) Local fallback factors
	const factor = EMISSION_FACTORS[habitType];
	if (typeof factor === "number") {
		return { emissionKg: round3(value * factor), method: "local_factor" };
	}

	return { emissionKg: 0, method: "unknown_type" };
}

// Backwards-compatible helper (existing code expects calculateEmissionKg(type, value))
export async function calculateEmissionKg(habitType, value, date) {
	const result = await calculateEmission({ habitType, value, date });
	return result.emissionKg;
}

export async function createEmissionEntry({ userId, sourceType, habitType, value, emissionKg, notes, date, region }) {
	const entryDate = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(entryDate.getTime())) throw new ApiError(400, "Invalid date");

	let finalKg = emissionKg;
	let method = "local_factor";

	// If caller doesn't provide a direct emissionKg, compute it (meaningful business logic)
	if (finalKg === undefined || finalKg === null) {
		if (!habitType || typeof value !== "number") throw new ApiError(400, "habitType and value required when emissionKg is omitted");
		const calc = await calculateEmission({ habitType, value, date: entryDate, region });
		finalKg = calc.emissionKg;
		method = calc.method;
	}

	const created = await EmissionEntry.create({
		userId,
		sourceType,
		habitType,
		value,
		emissionKg: finalKg,
		calculationMethod: method,
		notes,
		date: entryDate,
		region,
	});

	return created;
}

export async function listEmissionEntries({ userId, page, limit, from, to, sourceType, habitType, search }) {
	const filter = { userId };
	if (from || to) {
		filter.date = {};
		if (from) filter.date.$gte = from;
		if (to) filter.date.$lte = to;
	}
	if (sourceType) filter.sourceType = sourceType;
	if (habitType) filter.habitType = habitType;
	if (search) {
		filter.$or = [{ notes: { $regex: search, $options: "i" } }];
	}

	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
	const [items, total] = await Promise.all([
		EmissionEntry.find(filter).sort({ date: -1 }).skip(pg.skip).limit(pg.limit),
		EmissionEntry.countDocuments(filter),
	]);

	return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function getEmissionEntry({ userId, id }) {
	const entry = await EmissionEntry.findOne({ _id: id, userId });
	if (!entry) throw new ApiError(404, "Emission entry not found");
	return entry;
}

export async function updateEmissionEntry({ userId, id, patch }) {
	const entry = await EmissionEntry.findOne({ _id: id, userId });
	if (!entry) throw new ApiError(404, "Emission entry not found");

	if (entry.sourceType === "habit") {
		throw new ApiError(403, "Habit-derived entries are read-only; update the habit instead");
	}

	if (patch.date !== undefined) {
		const d = new Date(patch.date);
		if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid date");
		entry.date = d;
	}
	if (patch.notes !== undefined) entry.notes = patch.notes;
	if (patch.region !== undefined) entry.region = patch.region;
	if (patch.habitType !== undefined) entry.habitType = patch.habitType;
	if (patch.value !== undefined) entry.value = patch.value;

	if (patch.emissionKg !== undefined && patch.emissionKg !== null) {
		entry.emissionKg = patch.emissionKg;
		entry.calculationMethod = "local_factor";
	} else if (patch.habitType !== undefined || patch.value !== undefined || patch.region !== undefined) {
		if (!entry.habitType || typeof entry.value !== "number") {
			throw new ApiError(400, "habitType and value required to recompute emissionKg");
		}
		const calc = await calculateEmission({ habitType: entry.habitType, value: entry.value, date: entry.date, region: entry.region });
		entry.emissionKg = calc.emissionKg;
		entry.calculationMethod = calc.method;
	}

	await entry.save();
	return entry;
}

export async function deleteEmissionEntry({ userId, id }) {
	const entry = await EmissionEntry.findOne({ _id: id, userId });
	if (!entry) throw new ApiError(404, "Emission entry not found");
	if (entry.sourceType === "habit") {
		throw new ApiError(403, "Habit-derived entries are read-only; delete the habit instead");
	}
	await entry.deleteOne();
}

export async function getEmissionSummary({ userId, from, to }) {
	const match = { userId: toObjectIdIfPossible(userId) };
	if (from || to) {
		match.date = {};
		if (from) match.date.$gte = from;
		if (to) match.date.$lte = to;
	}

	const [totals, byType] = await Promise.all([
		EmissionEntry.aggregate([
			{ $match: match },
			{ $group: { _id: null, totalKg: { $sum: "$emissionKg" }, count: { $sum: 1 } } },
		]),
		EmissionEntry.aggregate([
			{ $match: match },
			{ $group: { _id: "$habitType", totalKg: { $sum: "$emissionKg" }, count: { $sum: 1 } } },
			{ $sort: { totalKg: -1 } },
		]),
	]);

	const gridIntensity = await getGridCarbonIntensity();

	return {
		totalKg: totals?.[0]?.totalKg || 0,
		count: totals?.[0]?.count || 0,
		byType,
		gridIntensityGPerKwh: gridIntensity,
	};
}

export async function getEmissionTrends({ userId, from, to }) {
	const match = { userId: toObjectIdIfPossible(userId) };
	if (from || to) {
		match.date = {};
		if (from) match.date.$gte = from;
		if (to) match.date.$lte = to;
	}

	// Group by calendar day (UTC) for simple charting.
	const rows = await EmissionEntry.aggregate([
		{ $match: match },
		{
			$group: {
				_id: {
					$dateToString: {
						format: "%Y-%m-%d",
						date: "$date",
						timezone: "UTC",
					},
				},
				totalKg: { $sum: "$emissionKg" },
				entries: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);

	return rows;
}
