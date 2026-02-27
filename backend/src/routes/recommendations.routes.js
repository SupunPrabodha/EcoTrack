import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  createRecommendationCtrl,
  deleteRecommendationCtrl,
  generateRecommendationsCtrl,
  listRecommendationsCtrl,
} from "../controllers/recommendations.controller.js";

const router = Router();
router.use(requireAuth);

const generateSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
});

const listSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().min(1).max(200).optional(),
    impact: z.string().min(1).max(32).optional(),
  }),
});

const createSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(160),
    body: z.string().min(1).max(2000),
    impact: z.string().min(1).max(32).optional(),
    context: z.any().optional(),
    evidence: z.any().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const deleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

router.get("/generate", validate(generateSchema), generateRecommendationsCtrl);
router.get("/", validate(listSchema), listRecommendationsCtrl);
router.post("/", validate(createSchema), createRecommendationCtrl);
router.delete("/:id", validate(deleteSchema), deleteRecommendationCtrl);

export default router;
