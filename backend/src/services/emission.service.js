import mongoose from "mongoose";
import { EMISSION_FACTORS } from "../utils/constants.js";
import { estimateCarbonInterfaceKg, getGridCarbonIntensity } from "./thirdparty.service.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

function round3(n) {
	return Math.round(n * 1000) / 1000;
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



















































// import { EMISSION_FACTORS } from "../utils/constants.js";
// import { ApiError } from "../utils/ApiError.js";
// import { Habit } from "../models/Habit.js";

// export function calculateEmissionKg(type, value) {
//   const factor = EMISSION_FACTORS[type];
//   if (factor === undefined) throw new ApiError(400, "Unknown habit type");
//   const emission = Number((value * factor).toFixed(4));
//   return emission;
// }

// export async function getSummary(userId, from, to) {
//   const match = {
//     userId,
//     date: { $gte: from, $lte: to }
//   };

//   const [result] = await Habit.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: null,
//         totalKg: { $sum: "$emissionKg" },
//         count: { $sum: 1 }
//       }
//     }
//   ]);

//   return {
//     totalKg: Number((result?.totalKg || 0).toFixed(2)),
//     entries: result?.count || 0
//   };
// }

// export async function getTrends(userId, from, to) {
//   return Habit.aggregate([
//     { $match: { userId, date: { $gte: from, $lte: to } } },
//     {
//       $group: {
//         _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
//         totalKg: { $sum: "$emissionKg" }
//       }
//     },
//     { $sort: { _id: 1 } }
//   ]);
// }

// export async function getLeaderboard(from, to, limit = 10) {
//   return Habit.aggregate([
//     { $match: { date: { $gte: from, $lte: to } } },
//     { $group: { _id: "$userId", totalKg: { $sum: "$emissionKg" } } },
//     { $sort: { totalKg: 1 } },
//     { $limit: limit },
//   ]);
// }
