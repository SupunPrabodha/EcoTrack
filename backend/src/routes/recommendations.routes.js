import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { recommendationsCtrl } from "../controllers/recommendations.controller.js";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
});

router.get("/", validate(schema), recommendationsCtrl);

export default router;
