import { asyncHandler } from "../utils/asyncHandler.js";
import {
	createGoal,
	deleteGoal,
	evaluateGoalProgress,
	getGoal,
	listGoals,
	updateGoal,
} from "../services/goal.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

export const createGoalCtrl = asyncHandler(async (req, res) => {
	const { title, maxKg, startDate, endDate, alertsEnabled, alertEmail } = req.validated.body;
	const goal = await createGoal({
		userId: req.user.userId,
		title,
		maxKg,
		startDate: new Date(startDate),
		endDate: new Date(endDate),
		alertsEnabled,
		alertEmail,
	});
	sendCreated(res, { data: goal });
});

export const listGoalsCtrl = asyncHandler(async (req, res) => {
	const { page, limit, status, search } = req.validated.query;
	const data = await listGoals({
		userId: req.user.userId,
		page: Number(page),
		limit: Number(limit),
		status: status || null,
		search: search || null,
	});
	sendSuccess(res, { data, meta: { page: data.page, limit: data.limit, total: data.total, pages: data.pages } });
});

export const getGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const goal = await getGoal({ userId: req.user.userId, id });
	sendSuccess(res, { data: goal });
});

export const updateGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const goal = await updateGoal({ userId: req.user.userId, id, patch: req.validated.body });
	sendSuccess(res, { data: goal });
});

export const deleteGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await deleteGoal({ userId: req.user.userId, id });
	sendSuccess(res, { message: "Goal deleted" });
});

export const evaluateGoalCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const data = await evaluateGoalProgress({ userId: req.user.userId, id });
	sendSuccess(res, { data });
});
