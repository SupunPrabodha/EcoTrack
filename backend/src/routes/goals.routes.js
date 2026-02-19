import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { progressCtrl, upsertGoalCtrl } from "../controllers/goals.controller.js";

const router = Router();
router.use(requireAuth);

const upsertSchema = z.object({
  body: z.object({
    period: z.enum(["weekly", "monthly"]),
    targetKg: z.number().min(0),
  }),
  params: z.object({}),
  query: z.object({})
});

const progressSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    period: z.enum(["weekly", "monthly"]),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
});

router.post("/", validate(upsertSchema), upsertGoalCtrl);
router.get("/progress", validate(progressSchema), progressCtrl);

export default router;
