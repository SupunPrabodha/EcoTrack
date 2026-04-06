import { Router } from "express";
import * as mapController from "../controllers/map.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Map
 *     description: Environmental map data (weather + air quality + optional grid intensity).
 */

/**
 * @openapi
 * /map/data:
 *   get:
 *     tags: [Map]
 *     summary: Get environmental data for predefined locations
 *     description: Returns weather, air quality, and optional grid intensity for a set of predefined locations.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/data", requireAuth, mapController.getMapData);

/**
 * @openapi
 * /map/location:
 *   get:
 *     tags: [Map]
 *     summary: Get environmental data for a specific coordinate
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: region
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 */
router.get("/location", requireAuth, mapController.getLocationData);

/**
 * @openapi
 * /map/nearby:
 *   get:
 *     tags: [Map]
 *     summary: Get nearby places around a coordinate with air quality + weather
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: cnt
 *         required: false
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 */
router.get("/nearby", requireAuth, mapController.getNearbyData);

export default router;
