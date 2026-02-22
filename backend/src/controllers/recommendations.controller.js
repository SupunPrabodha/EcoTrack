import { asyncHandler } from "../utils/asyncHandler.js";
import {
  buildRecommendations,
  deleteRecommendation,
  getRecommendation,
  listRecommendations,
  saveRecommendation,
  updateRecommendation,
} from "../services/recommendation.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

export const recommendationsGenerateCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await buildRecommendations(req.user.userId, new Date(from), new Date(to));
  sendSuccess(res, { data });
});

export const recommendationsSaveCtrl = asyncHandler(async (req, res) => {
  const { title, body, impact, context, evidence } = req.validated.body;
  const saved = await saveRecommendation({ userId: req.user.userId, title, body, impact, context, evidence });
  sendCreated(res, { data: saved });
});

export const recommendationsListCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, impact } = req.validated.query;
  const data = await listRecommendations({
    userId: req.user.userId,
    page: Number(page),
    limit: Number(limit),
    search: search || null,
    impact: impact || null,
  });
  sendSuccess(res, { data, meta: { page: data.page, limit: data.limit, total: data.total, pages: data.pages } });
});

export const recommendationsGetCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const rec = await getRecommendation({ userId: req.user.userId, id });
  sendSuccess(res, { data: rec });
});

export const recommendationsUpdateCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const rec = await updateRecommendation({ userId: req.user.userId, id, patch: req.validated.body });
  sendSuccess(res, { data: rec });
});

export const recommendationsDeleteCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await deleteRecommendation({ userId: req.user.userId, id });
  sendSuccess(res, { message: "Recommendation deleted" });
});
