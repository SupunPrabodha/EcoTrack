import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { Goal } from "../models/Goal.js";

export async function listUsers({ page, limit, search }) {
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email role createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit),
    User.countDocuments(filter),
  ]);

	return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function setUserRole({ userId, targetUserId, role }) {
  if (userId === targetUserId) throw new ApiError(400, "Cannot change your own role");
  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, "User not found");
  user.role = role;
  await user.save();
  return { id: user._id, email: user.email, role: user.role };
}

export async function bootstrapAdminByEmail({ token, email }) {
  const allow = process.env.ALLOW_BOOTSTRAP_ADMIN === "true";
  const configuredToken = process.env.BOOTSTRAP_ADMIN_TOKEN || "";

  if (!allow) throw new ApiError(404, "Not found");
  if (!configuredToken) throw new ApiError(500, "Bootstrap admin is not configured");
  if (!token || token !== configuredToken) throw new ApiError(403, "Invalid bootstrap token");

  const existingAdmin = await User.exists({ role: "admin" });
  if (existingAdmin) throw new ApiError(409, "Admin already exists");

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError(404, "User not found");

  user.role = "admin";
  await user.save();
  return { id: user._id, email: user.email, role: user.role };
}

export async function getEmissionsLeaderboard({ from, to, limit = 10, direction = "asc" }) {
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const sortDir = direction === "desc" ? -1 : 1;
  const rows = await EmissionEntry.aggregate([
    { $match: match },
    { $group: { _id: "$userId", totalKg: { $sum: "$emissionKg" }, entries: { $sum: 1 } } },
    { $sort: { totalKg: sortDir } },
    { $limit: Math.min(Math.max(Number(limit) || 10, 1), 100) },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $project: { userId: "$_id", totalKg: 1, entries: 1, user: { email: "$user.email", name: "$user.name", role: "$user.role" } } },
  ]);

  return { items: rows };
}

export async function getGlobalEmissionsAnalytics({ from, to }) {
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const [totals, byType, distinctUsers] = await Promise.all([
    EmissionEntry.aggregate([
      { $match: match },
      { $group: { _id: null, totalKg: { $sum: "$emissionKg" }, entries: { $sum: 1 } } },
    ]),
    EmissionEntry.aggregate([
      { $match: match },
      { $group: { _id: "$habitType", totalKg: { $sum: "$emissionKg" }, entries: { $sum: 1 } } },
      { $sort: { totalKg: -1 } },
    ]),
    EmissionEntry.distinct("userId", match),
  ]);

  return {
    totalKg: totals?.[0]?.totalKg || 0,
    entries: totals?.[0]?.entries || 0,
    users: distinctUsers?.length || 0,
    byType,
  };
}

export async function getGlobalGoalPerformance({ from, to }) {
  const match = {};
  if (from || to) {
    match.startDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const [counts, avgTarget, alerts] = await Promise.all([
    Goal.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Goal.aggregate([
      { $match: match },
      { $group: { _id: null, avgMaxKg: { $avg: "$maxKg" }, minMaxKg: { $min: "$maxKg" }, maxMaxKg: { $max: "$maxKg" } } },
    ]),
    Goal.aggregate([
      { $match: match },
      { $group: { _id: "$alertsEnabled", count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = Object.fromEntries((counts || []).map((r) => [r._id, r.count]));
  const alertsEnabled = Object.fromEntries((alerts || []).map((r) => [String(r._id), r.count]));

  return {
    byStatus,
    targetStats: avgTarget?.[0]
      ? { avgMaxKg: avgTarget[0].avgMaxKg, minMaxKg: avgTarget[0].minMaxKg, maxMaxKg: avgTarget[0].maxMaxKg }
      : { avgMaxKg: 0, minMaxKg: 0, maxMaxKg: 0 },
    alerts: {
      enabled: alertsEnabled.true || 0,
      disabled: alertsEnabled.false || 0,
    },
  };
}
