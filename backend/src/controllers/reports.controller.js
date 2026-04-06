import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { getMonthlyReport } from "../services/report.service.js";

export const monthlyReportCtrl = asyncHandler(async (req, res) => {
  const { month } = req.validated.query;
  const data = await getMonthlyReport({ userId: req.user.userId, month });
  sendSuccess(res, { data });
});
