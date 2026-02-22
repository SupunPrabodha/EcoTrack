import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { loginController, logoutController, meController, registerController } from "../controllers/auth.controller.js";
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
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (clears auth cookie)
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
