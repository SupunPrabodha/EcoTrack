import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  bootstrapAdminCtrl,
  emissionsAnalyticsCtrl,
  emissionsLeaderboardCtrl,
  goalsPerformanceCtrl,
  listUsersCtrl,
  setUserRoleCtrl,
} from "../controllers/admin.controller.js";

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Admin-only RBAC endpoints.
 */

const router = Router();

const bootstrapSchema = z.object({
  body: z.object({
    email: z.string().email(),
    token: z.string().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

router.post("/bootstrap", validate(bootstrapSchema), bootstrapAdminCtrl);

router.use(requireAuth, requireRole("admin"));

const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.string().default("1"),
    limit: z.string().default("10"),
    search: z.string().max(50).optional(),
  }),
});

router.get("/users", validate(listUsersSchema), listUsersCtrl);

const setRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"]),
  }),
  params: z.object({ id: z.string().min(10) }),
  query: z.object({}),
});

router.patch("/users/:id/role", validate(setRoleSchema), setUserRoleCtrl);

const dateRangeSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

router.get("/analytics/emissions", validate(dateRangeSchema), emissionsAnalyticsCtrl);

const leaderboardSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.string().default("10"),
    direction: z.enum(["asc", "desc"]).default("asc"),
  }),
});

router.get("/leaderboard/emissions", validate(leaderboardSchema), emissionsLeaderboardCtrl);

router.get("/analytics/goals", validate(dateRangeSchema), goalsPerformanceCtrl);

/**
 * @openapi
 * /admin/bootstrap:
 *   post:
 *     tags: [Admin]
 *     summary: Bootstrap the first admin user (dev/demo only)
 *     description: Requires server env to enable bootstrapping and a bootstrap token. Works only if no admin user exists yet.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             bootstrap:
 *               value:
 *                 email: "admin@example.com"
 *                 token: "YOUR_BOOTSTRAP_TOKEN"
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Admin already exists
 */

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 */

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Change a user's role (admin only)
 *     description: Attempting to change your own role is rejected.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             promote:
 *               value:
 *                 role: "admin"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Forbidden
 */

/**
 * @openapi
 * /admin/analytics/emissions:
 *   get:
 *     tags: [Admin]
 *     summary: Global emissions analytics (admin only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-02-15T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/leaderboard/emissions:
 *   get:
 *     tags: [Admin]
 *     summary: Emissions leaderboard across users (admin only)
 *     description: By default sorts ascending (lowest emissions first).
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-02-15T23:59:59.000Z"
 *       - in: query
 *         name: limit
 *         example: "10"
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         example: "asc"
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/analytics/goals:
 *   get:
 *     tags: [Admin]
 *     summary: Overall goal performance (admin only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         example: "2026-01-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         example: "2026-12-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: OK
 */

export default router;
