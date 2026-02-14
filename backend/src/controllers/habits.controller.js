import { asyncHandler } from "../utils/asyncHandler.js";
import { createHabit, listHabits, updateHabit, deleteHabit } from "../services/habit.service.js";

export const createHabitCtrl = asyncHandler(async (req, res) => {
  const { type, value, date } = req.validated.body;
  const habit = await createHabit({ userId: req.user.userId, type, value, date: new Date(date) });
  res.status(201).json({ success: true, data: habit });
});

export const listHabitsCtrl = asyncHandler(async (req, res) => {
  const { page, limit, from, to, type } = req.validated.query;
  const data = await listHabits({
    userId: req.user.userId,
    page: Number(page),
    limit: Number(limit),
    from: new Date(from), 
    to: new Date(to),
    type: type || null
  });
  res.json({ success: true, data });
});

export const updateHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { value } = req.validated.body;
  const habit = await updateHabit({ userId: req.user.userId, id, value });
  res.json({ success: true, data: habit });
});

export const deleteHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await deleteHabit({ userId: req.user.userId, id });
  res.json({ success: true, message: "Habit deleted" });
});
