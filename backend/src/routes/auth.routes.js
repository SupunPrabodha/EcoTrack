import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { loginController, logoutController, meController, registerController, updateMeController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Registration, login, session, and JWT identity.
 */

const router = Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.object({}),
  query: z.object({})
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  params: z.object({}),
  query: z.object({})
});

router.post("/register", validate(registerSchema), registerController);
router.post("/login", validate(loginSchema), loginController);
router.post("/logout", logoutController);
router.get("/me", requireAuth, meController);

const updateMeSchema = z.object({
  body: z
    .object({
      preferences: z
        .object({
          diet: z.enum(["omnivore", "vegetarian", "vegan"]).nullable().optional(),
          transportMode: z.enum(["car", "public", "mixed", "bike", "walk", "remote"]).nullable().optional(),
          recommendations: z
            .object({
              excludedRuleIds: z.array(z.string().min(1).max(80)).max(30).nullable().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .strict(),
  params: z.object({}),
  query: z.object({}),
});

router.patch("/me", requireAuth, validate(updateMeSchema), updateMeController);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Alex"
 *             email: "alex@example.com"
 *             password: "Password123!"
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Email already registered
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (sets httpOnly cookie and also accepts Bearer usage)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "alex@example.com"
 *             password: "Password123!"
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user identity from JWT
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update current user's preferences (personalization)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             preferences:
 *               diet: vegetarian
 *               transportMode: public
 *               recommendations:
 *                 excludedRuleIds: ["car_reduce"]
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (clears auth cookie)
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
