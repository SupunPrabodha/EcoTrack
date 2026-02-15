import { asyncHandler } from "../utils/asyncHandler.js";
import { getSummary, getTrends, getLeaderboard } from "../services/emission.service.js";

export const summaryCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getSummary(req.user.userId, new Date(from), new Date(to));
  res.json({ success: true, data });
});

export const trendsCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getTrends(req.user.userId, new Date(from), new Date(to));
  res.json({ success: true, data });
});

export const leaderboardCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getLeaderboard(new Date(from), new Date(to), 10);
  res.json({ success: true, data });
});
