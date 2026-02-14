import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { createHabitCtrl, deleteHabitCtrl, listHabitsCtrl, updateHabitCtrl } from "../controllers/habits.controller.js";
import { HABIT_TYPES } from "../utils/constants.js";

const router = Router();

router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    type: z.enum(HABIT_TYPES),
    value: z.number().min(0),
    date: z.string().datetime(),
  }),
  params: z.object({}),
  query: z.object({})
});

const listSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.string().default("1"),
    limit: z.string().default("10"),
    from: z.string().datetime(),
    to: z.string().datetime(),
    type: z.string().optional()
  })
});
 
const idSchema = z.object({
  body: z.object({ value: z.number().min(0) }).optional(),
  params: z.object({ id: z.string().min(10) }),
  query: z.object({})
});

router.post("/", validate(createSchema), createHabitCtrl);
router.get("/", validate(listSchema), listHabitsCtrl);
router.put("/:id", validate(idSchema), updateHabitCtrl);
router.delete("/:id", validate(idSchema), deleteHabitCtrl);

export default router;
