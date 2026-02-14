import { Habit } from "../models/Habit.js";
import { calculateEmissionKg } from "./emission.service.js";
import { ApiError } from "../utils/ApiError.js";

export async function createHabit({ userId, type, value, date }) {
  const emissionKg = calculateEmissionKg(type, value);

  try {
    const habit = await Habit.create({ userId, type, value, emissionKg, date });
    return habit;
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, "Habit already logged for this date/type");
    throw e;
  }
}

export async function listHabits({ userId, page, limit, from, to, type }) {
  const filter = { userId, date: { $gte: from, $lte: to } };
  if (type) filter.type = type;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Habit.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Habit.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function updateHabit({ userId, id, value }) {
  const habit = await Habit.findOne({ _id: id, userId });
  if (!habit) throw new ApiError(404, "Habit not found");

  habit.value = value;
  habit.emissionKg = calculateEmissionKg(habit.type, value);
  await habit.save();
  return habit;
}

export async function deleteHabit({ userId, id }) {
  const deleted = await Habit.findOneAndDelete({ _id: id, userId });
  if (!deleted) throw new ApiError(404, "Habit not found");
  return deleted;
}
