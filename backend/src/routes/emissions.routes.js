import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { leaderboardCtrl, summaryCtrl, trendsCtrl } from "../controllers/emissions.controller.js";

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

router.get("/summary", validate(rangeSchema), summaryCtrl);
router.get("/trends", validate(rangeSchema), trendsCtrl);
router.get("/leaderboard", validate(rangeSchema), leaderboardCtrl);

export default router;
