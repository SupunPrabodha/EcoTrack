import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createGoalCtrl, deleteGoalCtrl, listGoalsCtrl, updateGoalCtrl } from "../controllers/goals.controller.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
	body: z.object({
		title: z.string().min(1).max(140),
		targetKg: z.coerce.number().min(0),
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
	}),
	params: z.object({}).optional(),
	query: z.object({}).optional(),
});

const listSchema = z.object({
	body: z.object({}).optional(),
	params: z.object({}).optional(),
	query: z.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
	}),
});

const idSchema = z.object({
	body: z.object({
		title: z.string().min(1).max(140).optional(),
		targetKg: z.coerce.number().min(0).optional(),
		startDate: z.string().datetime().optional(),
		endDate: z.string().datetime().optional(),
	}).optional(),
	params: z.object({ id: z.string().min(1) }),
	query: z.object({}).optional(),
});

router.post("/", validate(createSchema), createGoalCtrl);
router.get("/", validate(listSchema), listGoalsCtrl);
router.put("/:id", validate(idSchema), updateGoalCtrl);
router.delete("/:id", validate(idSchema), deleteGoalCtrl);

export default router;

