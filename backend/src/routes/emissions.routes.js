import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
	emissionsQuerySchema,
	listEmissionsCtrl,
	rangeSchema,
	summaryCtrl,
	trendsCtrl,
} from "../controllers/emissions.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(emissionsQuerySchema), listEmissionsCtrl);
router.get("/summary", validate(rangeSchema), summaryCtrl);
router.get("/trends", validate(rangeSchema), trendsCtrl);

export default router;

