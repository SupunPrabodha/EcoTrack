import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getEmissionsLeaderboard,
  getGlobalEmissionsAnalytics,
  getGlobalGoalPerformance,
  listUsers,
  setUserRole,
  bootstrapAdminByEmail,
} from "../services/admin.service.js";
import { sendSuccess } from "../utils/response.js";

export const listUsersCtrl = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validated.query;
  const data = await listUsers({ page: Number(page), limit: Number(limit), search: search || null });
  sendSuccess(res, { data, meta: { page: data.page, limit: data.limit, total: data.total, pages: data.pages } });
});

export const setUserRoleCtrl = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { role } = req.validated.body;
  const data = await setUserRole({ userId: req.user.userId, targetUserId: id, role });
  sendSuccess(res, { data });
});

export const bootstrapAdminCtrl = asyncHandler(async (req, res) => {
  const { token, email } = req.validated.body;
  const data = await bootstrapAdminByEmail({ token, email });
  sendSuccess(res, { data, message: "Admin role granted" });
});

export const emissionsAnalyticsCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getGlobalEmissionsAnalytics({
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  });
  sendSuccess(res, { data });
});

export const emissionsLeaderboardCtrl = asyncHandler(async (req, res) => {
  const { from, to, limit, direction } = req.validated.query;
  const data = await getEmissionsLeaderboard({
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
    limit: Number(limit),
    direction: direction || "asc",
  });
  sendSuccess(res, { data });
});

export const goalsPerformanceCtrl = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;
  const data = await getGlobalGoalPerformance({
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  });
  sendSuccess(res, { data });
});
