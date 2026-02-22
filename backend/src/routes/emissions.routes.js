import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createEmissionCtrl, 
  listEmissionsCtrl,
  deleteEmissionCtrl,
  getEmissionCtrl,
  updateEmissionCtrl,
  emissionSummaryCtrl,
  emissionTrendsCtrl,
} from "../controllers/emissions.controller.js";
import { HABIT_TYPES } from "../utils/constants.js";

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
router.get("/:id", validate(idSchema), getEmissionCtrl);
router.delete("/:id", validate(idSchema), deleteEmissionCtrl);
router.put("/:id", validate(updateSchema), updateEmissionCtrl);
router.get("/summary", validate(summarySchema), emissionSummaryCtrl);
router.get("/trends", validate(trendsSchema), emissionTrendsCtrl);

export default router;
