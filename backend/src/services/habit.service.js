import mongoose from "mongoose";
import { Habit } from "../models/Habit.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { calculateEmission } from "./emission.service.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

function toObjectIdIfPossible(id) {
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
}

function toDayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function createHabit({ userId, type, value, date }) {
  const day = toDayStart(date);
  const { emissionKg, method } = await calculateEmission({ habitType: type, value, date: day });

  try {
    const habit = await Habit.create({
      userId,
      type,
      value,
      emissionKg,
      calculationMethod: method,
      date: day,
    });

    // Keep emissions component consistent: 1 habit => 1 emission entry.
    await EmissionEntry.create({
      userId,
      habitId: habit._id,
      sourceType: "habit",
      habitType: type,
      value,
      emissionKg,
      calculationMethod: method,
      date: day,
    });

    return habit;
  } catch (e) {
    if (e.code === 11000) {
      throw new ApiError(409, "Habit already logged for this date/type");
    }
    throw e;
  }
} 

export async function listHabits({ userId, page, limit, from, to, type }) {
  const filter = { userId, date: { $gte: from, $lte: to } };
  if (type) filter.type = type;

	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
  const [items, total] = await Promise.all([
    Habit.find(filter).sort({ date: -1 }).skip(pg.skip).limit(pg.limit),
    Habit.countDocuments(filter),
  ]);

  return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function summarizeHabits({ userId, from, to, type }) {
  const match = { userId: toObjectIdIfPossible(userId) };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }
  if (type) match.type = type;

  const rows = await Habit.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        totalEmissionKg: { $sum: "$emissionKg" },
        totalValue: { $sum: "$value" },
        entries: { $sum: 1 },
        firstDate: { $min: "$date" },
        lastDate: { $max: "$date" },
      },
    },
    { $sort: { lastDate: -1 } },
  ]);

  return {
    items: rows.map((r) => ({
      type: r._id,
      totalEmissionKg: r.totalEmissionKg || 0,
      totalValue: r.totalValue || 0,
      entries: r.entries || 0,
      firstDate: r.firstDate || null,
      lastDate: r.lastDate || null,
    })),
  };
}

export async function getHabit({ userId, id }) {
  const habit = await Habit.findOne({ _id: id, userId });
  if (!habit) throw new ApiError(404, "Habit not found");
  return habit;
}

export async function updateHabit({ userId, id, value }) {
  const habit = await Habit.findOne({ _id: id, userId });
  if (!habit) throw new ApiError(404, "Habit not found");

  habit.value = value;
  const { emissionKg, method } = await calculateEmission({ habitType: habit.type, value, date: habit.date });
  habit.emissionKg = emissionKg;
  habit.calculationMethod = method;
  await habit.save();

  await EmissionEntry.findOneAndUpdate(
    { habitId: habit._id, userId },
    {
      $set: {
        habitType: habit.type,
        value,
        emissionKg,
        calculationMethod: method,
        date: habit.date,
      },
    },
    { upsert: true, new: true }
  );

  return habit;
}

export async function deleteHabit({ userId, id }) {
  const deleted = await Habit.findOneAndDelete({ _id: id, userId });
  if (!deleted) throw new ApiError(404, "Habit not found");

  await EmissionEntry.findOneAndDelete({ habitId: deleted._id, userId });
  return deleted;
}
