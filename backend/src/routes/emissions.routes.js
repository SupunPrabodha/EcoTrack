import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
	createEmissionCtrl,
	deleteEmissionCtrl,
	emissionSummaryCtrl,
	emissionTrendsCtrl,
	getEmissionCtrl,
	listEmissionsCtrl,
	updateEmissionCtrl,
} from "../controllers/emissions.controller.js";
import { HABIT_TYPES } from "../utils/constants.js";

/**
 * @openapi
 * tags:
 *   - name: Emissions
 *     description: Emission entries (manual + habit-derived) and analytics.
 */

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
	body: z
		.object({
			sourceType: z.literal("manual"),
			habitType: z.enum(HABIT_TYPES).optional(),
			value: z.number().min(0).optional(),
			emissionKg: z.number().min(0).optional(),
			notes: z.string().max(500).optional(),
			region: z.string().max(50).optional(),
			date: z.string().datetime(),
		})
		.refine((b) => (b.emissionKg !== undefined ? true : b.habitType && b.value !== undefined), {
			message: "Provide either emissionKg or (habitType + value)",
			path: ["emissionKg"],
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
		from: z.string().datetime().optional(),
		to: z.string().datetime().optional(),
		sourceType: z.enum(["habit", "manual"]).optional(),
		habitType: z.enum(HABIT_TYPES).optional(),
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
			habitType: z.enum(HABIT_TYPES).optional(),
			value: z.number().min(0).optional(),
			emissionKg: z.number().min(0).nullable().optional(),
			notes: z.string().max(500).optional(),
			region: z.string().max(50).optional(),
			date: z.string().datetime().optional(),
		})
		.refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" }),
	params: z.object({ id: z.string().min(10) }),
	query: z.object({}),
});

const summarySchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}),
	query: z.object({
		from: z.string().datetime().optional(),
		to: z.string().datetime().optional(),
	}),
});

const trendsSchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}),
	query: z.object({
		from: z.string().datetime().optional(),
		to: z.string().datetime().optional(),
	}),
});

router.post("/", validate(createSchema), createEmissionCtrl);
router.get("/", validate(listSchema), listEmissionsCtrl);
router.get("/summary", validate(summarySchema), emissionSummaryCtrl);
router.get("/trends", validate(trendsSchema), emissionTrendsCtrl);
router.get("/:id", validate(idSchema), getEmissionCtrl);
router.put("/:id", validate(updateSchema), updateEmissionCtrl);
router.delete("/:id", validate(idSchema), deleteEmissionCtrl);

/**
 * @openapi
 * /emissions:
 *   post:
 *     tags: [Emissions]
 *     summary: Create a manual emission entry (service can compute via third-party APIs)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             computed:
 *               value:
 *                 sourceType: manual
 *                 habitType: electricity_kwh
 *                 value: 12
 *                 date: "2026-02-14T10:00:00.000Z"
 *                 notes: "Manual electricity reading"
 *             direct:
 *               value:
 *                 sourceType: manual
 *                 emissionKg: 3.5
 *                 date: "2026-02-14T10:00:00.000Z"
 *                 notes: "Known footprint"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *   get:
 *     tags: [Emissions]
 *     summary: List emission entries with pagination/filtering/search
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
 *         name: sourceType
 *         schema:
 *           type: string
 *           enum: [habit, manual]
 *       - in: query
 *         name: habitType
 *         schema:
 *           type: string
 *           enum: [car_km, public_transport_km, electricity_kwh, meat_meals, plastic_items]
 *       - in: query
 *         name: from
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-02-14T23:59:59.000Z"
 *       - in: query
 *         name: search
 *         example: "electricity"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /emissions/summary:
 *   get:
 *     tags: [Emissions]
 *     summary: Analytics summary for a date range (includes grid intensity when available)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-02-14T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /emissions/trends:
 *   get:
 *     tags: [Emissions]
 *     summary: Daily emission totals for charting
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-02-14T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /emissions/{id}:
 *   get:
 *     tags: [Emissions]
 *     summary: Get an emission entry by id
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Emissions]
 *     summary: Update a manual emission entry (habit-derived entries are read-only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Habit-derived entry cannot be updated
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Emissions]
 *     summary: Delete a manual emission entry (habit-derived entries are read-only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Habit-derived entry cannot be deleted
 *       404:
 *         description: Not found
 */

export default router;
