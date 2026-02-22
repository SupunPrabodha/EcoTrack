import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
	createGoalCtrl,
	deleteGoalCtrl,
	evaluateGoalCtrl,
	getGoalCtrl,
	listGoalsCtrl,
	updateGoalCtrl,
} from "../controllers/goals.controller.js";

/**
 * @openapi
 * tags:
 *   - name: Goals
 *     description: Goal & accountability tracking (with optional email alerts).
 */

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
	body: z.object({
		title: z.string().min(3).max(120),
		maxKg: z.number().min(0),
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
		alertsEnabled: z.boolean().optional(),
		alertEmail: z.string().email().optional(),
	}),
	params: z.object({}),
	query: z.object({}),
});

const listSchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}),
	query: z.object({
		page: z.string().default("1"),
		limit: z.string().default("10"),
		status: z.enum(["active", "achieved", "failed"]).optional(),
		search: z.string().max(50).optional(),
	}),
});

const idSchema = z.object({
	body: z.object({}).optional(),
	params: z.object({ id: z.string().min(10) }),
	query: z.object({}),
});

const updateSchema = z.object({
	body: z
		.object({
			title: z.string().min(3).max(120).optional(),
			maxKg: z.number().min(0).optional(),
			startDate: z.string().datetime().optional(),
			endDate: z.string().datetime().optional(),
			status: z.enum(["active", "achieved", "failed"]).optional(),
			alertsEnabled: z.boolean().optional(),
			alertEmail: z.string().email().optional(),
		})
		.refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" }),
	params: z.object({ id: z.string().min(10) }),
	query: z.object({}),
});

router.post("/", validate(createSchema), createGoalCtrl);
router.get("/", validate(listSchema), listGoalsCtrl);
router.get("/:id", validate(idSchema), getGoalCtrl);
router.put("/:id", validate(updateSchema), updateGoalCtrl);
router.delete("/:id", validate(idSchema), deleteGoalCtrl);
router.post("/:id/evaluate", validate(idSchema), evaluateGoalCtrl);

/**
 * @openapi
 * /goals:
 *   post:
 *     tags: [Goals]
 *     summary: Create a goal
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             monthly:
 *               value:
 *                 title: "Keep under 50kg this month"
 *                 maxKg: 50
 *                 startDate: "2026-02-01T00:00:00.000Z"
 *                 endDate: "2026-02-29T23:59:59.000Z"
 *                 alertsEnabled: true
 *                 alertEmail: "me@example.com"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *   get:
 *     tags: [Goals]
 *     summary: List goals
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         example: "1"
 *       - in: query
 *         name: limit
 *         example: "10"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, achieved, failed]
 *       - in: query
 *         name: search
 *         example: "50kg"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /goals/{id}:
 *   get:
 *     tags: [Goals]
 *     summary: Get a goal by id
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Goals]
 *     summary: Update a goal
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     tags: [Goals]
 *     summary: Delete a goal
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /goals/{id}/evaluate:
 *   post:
 *     tags: [Goals]
 *     summary: Evaluate progress against a goal (may trigger email alert)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
