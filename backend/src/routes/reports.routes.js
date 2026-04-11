import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { monthlyReportCtrl } from "../controllers/reports.controller.js";

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Monthly reports for emissions.
 */

const router = Router();
router.use(requireAuth);

const monthSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
  }),
});

router.get("/monthly", validate(monthSchema), monthlyReportCtrl);

/**
 * @openapi
 * /reports/monthly:
 *   get:
 *     tags: [Reports]
 *     summary: Monthly emissions report (graph + recommendations/feedback)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         example: "2026-03"
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
