import { asyncHandler } from "../utils/asyncHandler.js";
import { buildRecommendations } from "../services/recommendation.service.js";

export const recommendationsCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await buildRecommendations(req.user.userId, new Date(from), new Date(to));
  res.json({ success: true, data });
});
