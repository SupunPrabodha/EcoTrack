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

export const listEmissionsCtrl = asyncHandler(async (req, res) => {
	const { page, limit, from, to, sourceType, habitType, search } = req.validated.query;
	const data = await listEmissionEntries({
		userId: req.user.userId,
		page: Number(page),
		limit: Number(limit),
		from: from ? new Date(from) : null,
		to: to ? new Date(to) : null,
		sourceType: sourceType || null,
		habitType: habitType || null,
		search: search || null,
	});
	sendSuccess(res, { data, meta: { page: data.page, limit: data.limit, total: data.total, pages: data.pages } });
});

export const getEmissionCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const entry = await getEmissionEntry({ userId: req.user.userId, id });
	sendSuccess(res, { data: entry });
});

export const deleteEmissionCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await deleteEmissionEntry({ userId: req.user.userId, id });
	sendSuccess(res, { message: "Emission entry deleted" });
});

export const updateEmissionCtrl = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const entry = await updateEmissionEntry({ userId: req.user.userId, id, patch: req.validated.body });
	sendSuccess(res, { data: entry });
});

export const emissionSummaryCtrl = asyncHandler(async (req, res) => {
	const { from, to } = req.validated.query;
	const data = await getEmissionSummary({
		userId: req.user.userId,
		from: from ? new Date(from) : null,
		to: to ? new Date(to) : null,
	});
	sendSuccess(res, { data });
});

export const emissionTrendsCtrl = asyncHandler(async (req, res) => {
	const { from, to } = req.validated.query;
	const data = await getEmissionTrends({
		userId: req.user.userId,
		from: from ? new Date(from) : null,
		to: to ? new Date(to) : null,
	});
	sendSuccess(res, { data });
});

export const leaderboardCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getLeaderboard(new Date(from), new Date(to), 10);
  res.json({ success: true, data });
});
