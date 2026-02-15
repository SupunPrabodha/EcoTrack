import { EMISSION_FACTORS } from "../utils/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { Habit } from "../models/Habit.js";

export function calculateEmissionKg(type, value) {
  const factor = EMISSION_FACTORS[type];
  if (factor === undefined) throw new ApiError(400, "Unknown habit type");
  const emission = Number((value * factor).toFixed(4));
  return emission;
}

export async function getSummary(userId, from, to) {
  const match = {
    userId,
    date: { $gte: from, $lte: to }
  };

  const [result] = await Habit.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalKg: { $sum: "$emissionKg" },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalKg: Number((result?.totalKg || 0).toFixed(2)),
    entries: result?.count || 0
  };
}

export async function getTrends(userId, from, to) {
  return Habit.aggregate([
    { $match: { userId, date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        totalKg: { $sum: "$emissionKg" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
}

export async function getLeaderboard(from, to, limit = 10) {
  return Habit.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: "$userId", totalKg: { $sum: "$emissionKg" } } },
    { $sort: { totalKg: 1 } },
    { $limit: limit },
  ]);
}
