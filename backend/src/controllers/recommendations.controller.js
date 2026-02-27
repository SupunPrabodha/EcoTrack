import { asyncHandler } from "../utils/asyncHandler.js";
import { buildRecommendations } from "../services/recommendation.service.js";
import { Recommendation } from "../models/Recommendation.js";

function toInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export const generateRecommendationsCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await buildRecommendations(req.user.userId, new Date(from), new Date(to));
  res.json({ success: true, data });
});

export const createRecommendationCtrl = asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const created = await Recommendation.create({
    userId: req.user.userId,
    title: payload.title,
    body: payload.body,
    impact: payload.impact,
    context: payload.context,
    evidence: payload.evidence,
  });
  res.status(201).json({ success: true, data: created });
});

export const listRecommendationsCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search, impact } = req.validated.query;

  const safeLimit = Math.min(50, Math.max(1, toInt(limit, 10)));
  const safePage = Math.max(1, toInt(page, 1));
  const skip = (safePage - 1) * safeLimit;

  const filter = { userId: req.user.userId };
  if (impact) filter.impact = impact;
  if (search) {
    const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: re }, { body: re }];
  }

  const [items, total] = await Promise.all([
    Recommendation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Recommendation.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / safeLimit));
  res.json({
    success: true,
    data: { items },
    meta: { page: safePage, limit: safeLimit, pages, total },
  });
});

export const deleteRecommendationCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const deleted = await Recommendation.findOneAndDelete({ _id: id, userId: req.user.userId });
  if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: { id } });
});

// Backwards-compatible name (older UI may call GET /api/recommendations?from&to)
export const recommendationsCtrl = generateRecommendationsCtrl;

