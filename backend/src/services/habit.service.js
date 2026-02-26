import { Habit } from "../models/Habit.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { calculateEmission } from "./emission.service.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

export async function createHabit({ userId, type, value, date }) {
  const { emissionKg, method } = await calculateEmission({ habitType: type, value, date });

  try {
    const habit = await Habit.create({ userId, type, value, emissionKg, calculationMethod: method, date });

    // Keep emissions component consistent: 1 habit => 1 emission entry.
    await EmissionEntry.create({
      userId,
      habitId: habit._id,
      sourceType: "habit",
      habitType: type,
      value,
      emissionKg,
      calculationMethod: method,
      date,
    });

    return habit;
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, "Habit already logged for this date/type");
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
