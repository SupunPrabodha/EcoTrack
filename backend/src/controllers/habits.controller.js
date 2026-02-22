import { asyncHandler } from "../utils/asyncHandler.js";
import { createHabit, listHabits, updateHabit, deleteHabit, getHabit } from "../services/habit.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

export const createHabitCtrl = asyncHandler(async (req, res) => {
  const { type, value, date } = req.validated.body;
  const habit = await createHabit({ userId: req.user.userId, type, value, date: new Date(date) });
  sendCreated(res, { data: habit });
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
  sendSuccess(res, { data, meta: { page: data.page, limit: data.limit, total: data.total, pages: data.pages } });
});

export const updateHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { value } = req.validated.body;
  const habit = await updateHabit({ userId: req.user.userId, id, value });
  sendSuccess(res, { data: habit });
});

export const getHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const habit = await getHabit({ userId: req.user.userId, id });
  sendSuccess(res, { data: habit });
});

export const deleteHabitCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await deleteHabit({ userId: req.user.userId, id });
  sendSuccess(res, { message: "Habit deleted" });
});
