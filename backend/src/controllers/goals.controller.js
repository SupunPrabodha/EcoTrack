import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createGoal,
  deleteGoal,
  evaluateGoalProgress,
  getGoal,
  listGoals,
  updateGoal,
  getGoalEmissionUsageSummary,
} from "../services/goal.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

//Create a new Goal
export const createGoalCtrl = asyncHandler(async (req, res) => {
  const { title, maxKg, startDate, endDate, alertsEnabled, alertEmail, period } =
    req.validated.body;
  const goal = await createGoal({
    userId: req.user.userId,
    title,
    maxKg,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    period,
    alertsEnabled,
    alertEmail,
  });
  sendCreated(res, { data: goal });
});

//List all goaadls
export const listGoalsCtrl = asyncHandler(async (req, res) => {
  const { page, limit, status, search, period } = req.validated.query;
  const data = await listGoals({
    userId: req.user.userId,
    page: Number(page),
    limit: Number(limit),
    status: status || null,
    period: period || null,
    search: search || null,
  });
  sendSuccess(res, {
    data,
    meta: {
      page: data.page,
      limit: data.limit,
      total: data.total,
      pages: data.pages,
    },
  });
});

//Get Goal By ID
export const getGoalCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const goal = await getGoal({ userId: req.user.userId, id });
  sendSuccess(res, { data: goal });
});

//Update Goal By ID
export const updateGoalCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const goal = await updateGoal({
    userId: req.user.userId,
    id,
    patch: req.validated.body,
  });
  sendSuccess(res, { data: goal });
});

//Delete Goal By ID
export const deleteGoalCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await deleteGoal({ userId: req.user.userId, id });
  sendSuccess(res, { message: "Goal deleted" });
});

//Evaluate Goal Progress
export const evaluateGoalCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const data = await evaluateGoalProgress({ userId: req.user.userId, id });
  sendSuccess(res, { data });
});

// External CO2 usage summary for goals page (Climatiq-powered)
export const goalUsageSummaryCtrl = asyncHandler(async (req, res) => {
  const data = await getGoalEmissionUsageSummary({ userId: req.user.userId });
  sendSuccess(res, { data });
});
