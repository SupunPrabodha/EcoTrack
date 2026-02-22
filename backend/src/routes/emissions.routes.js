import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { createEmissionCtrl, leaderboardCtrl, summaryCtrl, trendsCtrl } from "../controllers/emissions.controller.js";
import { HABIT_TYPES } from "../utils/constants.js";


const router = Router();
router.use(requireAuth);

const rangeSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
});

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

router.post("/", validate(createSchema), createEmissionCtrl);
router.get("/summary", validate(rangeSchema), summaryCtrl);
router.get("/trends", validate(rangeSchema), trendsCtrl);
router.get("/leaderboard", validate(rangeSchema), leaderboardCtrl);

export default router;
