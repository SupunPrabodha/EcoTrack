import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { createHabitCtrl, deleteHabitCtrl, getHabitCtrl, listHabitsCtrl, updateHabitCtrl } from "../controllers/habits.controller.js";
import { HABIT_TYPES } from "../utils/constants.js";

/**
 * @openapi
 * tags:
 *   - name: Habits
 *     description: Habit logging with emission impact.
 */

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
router.get("/:id", validate(idSchema), getHabitCtrl);
router.put("/:id", validate(idSchema), updateHabitCtrl);
router.patch("/:id", validate(idSchema), updateHabitCtrl);
router.delete("/:id", validate(idSchema), deleteHabitCtrl);

/**
 * @openapi
 * /habits:
 *   post:
 *     tags: [Habits]
 *     summary: Create a habit log (emission computed in service layer)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             type: car_km
 *             value: 12
 *             date: "2026-02-14T10:00:00.000Z"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate habit for same date/type
 *   get:
 *     tags: [Habits]
 *     summary: List habits with pagination and date-range filtering
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
 *         name: from
 *         required: true
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         required: true
 *         example: "2026-02-14T23:59:59.000Z"
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [car_km, public_transport_km, electricity_kwh, meat_meals, plastic_items]
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /habits/{id}:
 *   get:
 *     tags: [Habits]
 *     summary: Get a habit log by id
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         example: "65c9f2c8c7d4b2d1a0b1c2d3"
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Habits]
 *     summary: Update a habit value (emission recomputed)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             value: 20
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     tags: [Habits]
 *     summary: Delete a habit log
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
