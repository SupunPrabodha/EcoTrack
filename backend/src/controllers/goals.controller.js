import { asyncHandler } from "../utils/asyncHandler.js";
import { upsertGoal, getGoalProgress } from "../services/goal.service.js";

export const upsertGoalCtrl = asyncHandler(async (req, res) => {
  const { period, targetKg } = req.validated.body;
  const goal = await upsertGoal({ userId: req.user.userId, period, targetKg });
  res.status(201).json({ success: true, data: goal });
});

export const progressCtrl = asyncHandler(async (req, res) => {
  const { period, from, to } = req.validated.query;
  const data = await getGoalProgress(req.user.userId, period, new Date(from), new Date(to));
  res.json({ success: true, data });
});
