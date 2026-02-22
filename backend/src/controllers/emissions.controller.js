import { asyncHandler } from "../utils/asyncHandler.js";
import {
	createEmissionEntry,
	deleteEmissionEntry,
	getEmissionEntry,
	getEmissionSummary,
	getEmissionTrends,
	listEmissionEntries,
	updateEmissionEntry,
} from "../services/emission.service.js";

import { sendCreated, sendSuccess } from "../utils/response.js";

export const createEmissionCtrl = asyncHandler(async (req, res) => {
	const { sourceType, habitType, value, emissionKg, notes, date, region } = req.validated.body;
	const entry = await createEmissionEntry({
		userId: req.user.userId,
		sourceType,
		habitType,
		value,
		emissionKg,
		notes,
		date: new Date(date),
		region,
	});
	sendCreated(res, { data: entry });
});

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
