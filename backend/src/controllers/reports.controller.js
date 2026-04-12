import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { generateMonthlyEmissionsReportPdf, getMonthlyReport } from "../services/report.service.js";

export const monthlyReportCtrl = asyncHandler(async (req, res) => {
  const { month, tzOffset } = req.validated.query;
  const data = await getMonthlyReport({ userId: req.user.userId, month, tzOffsetMinutes: tzOffset });
  sendSuccess(res, { data });
});

export const monthlyReportPdfCtrl = asyncHandler(async (req, res) => {
  const { month, tzOffset } = req.validated.query;
  const pdf = await generateMonthlyEmissionsReportPdf({ userId: req.user.userId, month, tzOffsetMinutes: tzOffset });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ecotrack-monthly-report-${month}.pdf"`);
  res.status(200).send(pdf);
});
