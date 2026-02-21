import { Goal } from "../models/Goal.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { sendGoalAlertEmail } from "./thirdparty.service.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

export async function createGoal({ userId, title, maxKg, startDate, endDate, alertsEnabled, alertEmail }) {
	const start = startDate instanceof Date ? startDate : new Date(startDate);
	const end = endDate instanceof Date ? endDate : new Date(endDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, "Invalid startDate/endDate");
	if (end <= start) throw new ApiError(400, "endDate must be after startDate");

	// Enforce: only one active goal per overlapping period.
	const overlapping = await Goal.findOne({
		userId,
		status: "active",
		$and: [{ startDate: { $lt: end } }, { endDate: { $gt: start } }],
	});
	if (overlapping) {
		throw new ApiError(409, "An active goal already exists for this period");
	}

	return Goal.create({
		userId,
		title,
		maxKg,
		startDate: start,
		endDate: end,
		alertsEnabled: alertsEnabled ?? true,
		alertEmail: alertEmail || undefined,
	});
}

export async function listGoals({ userId, page, limit, status, search }) {
	const filter = { userId };
	if (status) filter.status = status;
	if (search) filter.title = { $regex: search, $options: "i" };
	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
	const [items, total] = await Promise.all([
		Goal.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
		Goal.countDocuments(filter),
	]);

	return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function getGoal({ userId, id }) {
	const goal = await Goal.findOne({ _id: id, userId });
	if (!goal) throw new ApiError(404, "Goal not found");
	return goal;
}

export async function updateGoal({ userId, id, patch }) {
	const goal = await Goal.findOne({ _id: id, userId });
	if (!goal) throw new ApiError(404, "Goal not found");

	if (patch.title !== undefined) goal.title = patch.title;
	if (patch.maxKg !== undefined) goal.maxKg = patch.maxKg;
	if (patch.status !== undefined) goal.status = patch.status;
	if (patch.alertsEnabled !== undefined) goal.alertsEnabled = patch.alertsEnabled;
	if (patch.alertEmail !== undefined) goal.alertEmail = patch.alertEmail || undefined;
	if (patch.startDate !== undefined) {
		const d = new Date(patch.startDate);
		if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid startDate");
		goal.startDate = d;
	}
	if (patch.endDate !== undefined) {
		const d = new Date(patch.endDate);
		if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid endDate");
		goal.endDate = d;
	}
	if (goal.endDate <= goal.startDate) throw new ApiError(400, "endDate must be after startDate");

	await goal.save();
	return goal;
}

export async function deleteGoal({ userId, id }) {
	const deleted = await Goal.findOneAndDelete({ _id: id, userId });
	if (!deleted) throw new ApiError(404, "Goal not found");
}

export async function evaluateGoalProgress({ userId, id }) {
	const goal = await Goal.findOne({ _id: id, userId });
	if (!goal) throw new ApiError(404, "Goal not found");

	const now = new Date();
	const from = goal.startDate;
	const to = now < goal.endDate ? now : goal.endDate;

	const totals = await EmissionEntry.aggregate([
		{ $match: { userId: goal.userId, date: { $gte: from, $lte: to } } },
		{ $group: { _id: null, totalKg: { $sum: "$emissionKg" } } },
	]);

	const currentKg = totals?.[0]?.totalKg || 0;
	const remainingKg = Math.max(goal.maxKg - currentKg, 0);
	const exceeded = currentKg > goal.maxKg;

	// Determine status at end of period
	if (now >= goal.endDate) {
		goal.status = exceeded ? "failed" : "achieved";
	} else if (goal.status !== "active") {
		// keep manual overrides
	} else {
		goal.status = "active";
	}

	let emailResult = { sent: false, reason: "alerts_disabled" };

	if (goal.alertsEnabled && exceeded) {
		const user = await User.findById(userId);
		const toEmail = goal.alertEmail || user?.email;
		if (toEmail) {
			const subject = `EcoTrack Goal Alert: ${goal.title}`;
			const text = `Your emissions for this goal period have exceeded the target.\n\n` +
				`Goal: ${goal.title}\nTarget (max): ${goal.maxKg} kg CO2e\nCurrent: ${currentKg.toFixed(2)} kg CO2e\nRemaining: ${remainingKg.toFixed(2)} kg CO2e\n`;
			emailResult = await sendGoalAlertEmail({ to: toEmail, subject, text });
			goal.lastAlertAt = new Date();
		} else {
			emailResult = { sent: false, reason: "no_email" };
		}
	}

	await goal.save();

	return {
		goal,
		progress: {
			currentKg,
			maxKg: goal.maxKg,
			remainingKg,
			exceeded,
			status: goal.status,
			period: { startDate: goal.startDate, endDate: goal.endDate },
		},
		alert: emailResult,
	};
}
