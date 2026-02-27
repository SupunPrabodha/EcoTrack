import { asyncHandler } from "../utils/asyncHandler.js";
import { createGoal, deleteGoal, listGoals, updateGoal } from "../services/goal.service.js";

export const createGoalCtrl = asyncHandler(async (req, res) => {
	const { title, targetKg, startDate, endDate } = req.validated.body;
	const goal = await createGoal({
		userId: req.user.userId,
		title,
		targetKg,
		startDate: new Date(startDate),
		endDate: new Date(endDate),
	});
	res.status(201).json({ success: true, data: goal });
});

export const listGoalsCtrl = asyncHandler(async (req, res) => {
	const { page, limit } = req.validated.query;
	const data = await listGoals({ userId: req.user.userId, page, limit });
	res.json({ success: true, data });
});

export const updateGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const patch = req.validated.body;
	const goal = await updateGoal({ userId: req.user.userId, id, patch });
	res.json({ success: true, data: goal });
});

export const deleteGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await deleteGoal({ userId: req.user.userId, id });
	res.json({ success: true, message: "Goal deleted" });
});

