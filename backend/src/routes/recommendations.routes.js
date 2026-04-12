import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  recommendationsDeleteCtrl,
  recommendationsDigestCtrl,
  recommendationsFeedbackCtrl,
  recommendationsGenerateCtrl,
  recommendationsGetCtrl,
  recommendationsListCtrl,
  recommendationsReportCtrl,
  recommendationsSaveCtrl,
  recommendationsUpdateCtrl,
} from "../controllers/recommendations.controller.js";

/**
 * @openapi
 * tags:
 *   - name: Recommendations
 *     description: Personalized tips (generated using contextual data) and saved recommendations CRUD.
 */

const router = Router();
router.use(requireAuth);

const generateSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    region: z.string().max(50).optional(),
  }),
}).refine(
  (r) =>
    (r.query.lat === undefined && r.query.lon === undefined) ||
    (typeof r.query.lat === "number" && typeof r.query.lon === "number"),
  { message: "lat and lon must be provided together" }
);

const reportSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
});

const digestSchema = z
  .object({
    body: z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        periodDays: z.number().int().min(1).max(31).optional(),
        maxTips: z.number().int().min(1).max(10).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lon: z.number().min(-180).max(180).optional(),
        region: z.string().max(50).optional(),
      })
      .default({}),
    params: z.object({}),
    query: z.object({}),
  })
  .refine(
    (r) =>
      (r.body.from === undefined && r.body.to === undefined) ||
      (typeof r.body.from === "string" && typeof r.body.to === "string"),
    { message: "from and to must be provided together" }
  )
  .refine(
    (r) =>
      (r.body.lat === undefined && r.body.lon === undefined) ||
      (typeof r.body.lat === "number" && typeof r.body.lon === "number"),
    { message: "lat and lon must be provided together" }
  );

const saveSchema = z.object({
  body: z.object({
    ruleId: z.string().min(1).max(80).optional(),
    title: z.string().min(3).max(120),
    body: z.string().min(10).max(1000),
    impact: z.enum(["Low", "Medium", "High", "Positive"]).optional(),
    context: z
      .object({
        weather: z
          .object({
            city: z.string().optional(),
            condition: z.string().optional(),
            tempC: z.number().optional(),
          })
          .optional(),
        airPollution: z
          .object({
            aqi: z.number().int().min(1).max(5).optional(),
            aqiLabel: z.string().max(30).optional(),
          })
          .optional(),
        gridIntensityGPerKwh: z.number().min(0).optional(),
        location: z
          .object({
            lat: z.number().min(-90).max(90),
            lon: z.number().min(-180).max(180),
            region: z.string().max(50).optional(),
          })
          .optional(),
        range: z
          .object({
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
          })
          .optional(),
      })
      .optional(),

    evidence: z
      .object({
        why: z.array(z.string().min(1).max(200)).max(10).optional(),
        estimatedKgSaved: z.number().min(0).optional(),
        habits: z
          .object({
            car_km: z.object({ totalValue: z.number(), totalKg: z.number() }).optional(),
            public_transport_km: z.object({ totalValue: z.number(), totalKg: z.number() }).optional(),
            electricity_kwh: z.object({ totalValue: z.number(), totalKg: z.number() }).optional(),
            meat_meals: z.object({ totalValue: z.number(), totalKg: z.number() }).optional(),
            plastic_items: z.object({ totalValue: z.number(), totalKg: z.number() }).optional(),
          })
          .optional(),
        weather: z
          .object({
            city: z.string().optional(),
            condition: z.string().optional(),
            tempC: z.number().optional(),
          })
          .optional(),
        airPollution: z
          .object({
            aqi: z.number().int().min(1).max(5).optional(),
            aqiLabel: z.string().max(30).optional(),
          })
          .optional(),
        gridIntensityGPerKwh: z.number().min(0).optional(),
        goals: z
          .object({
            activeGoalId: z.string().min(10).optional(),
            goalTitle: z.string().max(120).optional(),
            currentKg: z.number().optional(),
            maxKg: z.number().optional(),
            exceeded: z.boolean().optional(),
          })
          .optional(),
        range: z
          .object({
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

const listSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.string().default("1"),
    limit: z.string().default("10"),
    search: z.string().max(50).optional(),
    impact: z.enum(["Low", "Medium", "High", "Positive"]).optional(),
  }),
});

const idSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(10) }),
  query: z.object({}),
});

const updateSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(120).optional(),
      body: z.string().min(10).max(1000).optional(),
      impact: z.enum(["Low", "Medium", "High", "Positive"]).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" }),
  params: z.object({ id: z.string().min(10) }),
  query: z.object({}),
});

const feedbackSchema = z.object({
  body: z
    .object({
      status: z.enum(["saved", "done", "dismissed"]).optional(),
      dismissDays: z.number().int().min(1).max(365).optional(),
      rating: z.enum(["useful", "not_useful"]).optional(),
      feedbackNote: z.string().max(300).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" }),
  params: z.object({ id: z.string().min(10) }),
  query: z.object({}),
});

router.get("/generate", validate(generateSchema), recommendationsGenerateCtrl);
router.get("/report", validate(reportSchema), recommendationsReportCtrl);
router.post("/digest", validate(digestSchema), recommendationsDigestCtrl);

router.post("/", validate(saveSchema), recommendationsSaveCtrl);
router.get("/", validate(listSchema), recommendationsListCtrl);
router.get("/:id", validate(idSchema), recommendationsGetCtrl);
router.put("/:id", validate(updateSchema), recommendationsUpdateCtrl);
router.patch("/:id/feedback", validate(feedbackSchema), recommendationsFeedbackCtrl);
router.delete("/:id", validate(idSchema), recommendationsDeleteCtrl);

/**
 * @openapi
 * /recommendations/generate:
 *   get:
 *     tags: [Recommendations]
 *     summary: Generate recommendations based on a date range
 *     description: |
 *       Optional context:
 *       - Provide `lat` and `lon` together to use local weather + air quality.
 *       - Provide `region` (Carbon Intensity region id) to use local grid intensity when estimating electricity savings.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         required: true
 *         example: "2026-02-14T23:59:59.000Z"
 *       - in: query
 *         name: lat
 *         required: false
 *         description: Latitude (must be provided together with `lon`).
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         example: 51.5
 *       - in: query
 *         name: lon
 *         required: false
 *         description: Longitude (must be provided together with `lat`).
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         example: -0.12
 *       - in: query
 *         name: region
 *         required: false
 *         description: Optional Carbon Intensity region id.
 *         schema:
 *           type: string
 *           maxLength: 50
 *         example: "1"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 */

/**
 * @openapi
 * /recommendations/digest:
 *   post:
 *     tags: [Recommendations]
 *     summary: Send a short recommendations digest email
 *     description: |
 *       Builds tips for a given date range (or last N days) and emails a digest to the signed-in user.
 *
 *       Notes:
 *       - Provide `from` and `to` together, OR omit both and use `periodDays` (default 7).
 *       - Provide `lat` and `lon` together to use local weather + air quality.
 *       - In `NODE_ENV=test`, the endpoint returns `{ sent: false, reason: "test_mode" }`.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           examples:
 *             last7Days:
 *               value:
 *                 periodDays: 7
 *                 maxTips: 3
 *             explicitRangeWithLocation:
 *               value:
 *                 from: "2026-02-01T00:00:00.000Z"
 *                 to: "2026-02-14T23:59:59.000Z"
 *                 lat: 51.5
 *                 lon: -0.12
 *                 region: "1"
 *                 maxTips: 3
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 */

/**
 * @openapi
 * /recommendations/report:
 *   get:
 *     tags: [Recommendations]
 *     summary: Download a PDF report of your saved recommendations for a date range
 *     description: |
 *       Returns a professional PDF report summarizing your saved recommendations and feedback in the selected range.
 *
 *       Report sections (high-level):
 *       - Report context (date range + generated timestamp)
 *       - Summary KPIs (counts and basic rates)
 *       - Recent saved recommendations (sample list)
 *
 *       The response is sent as a downloadable attachment (`Content-Disposition: attachment`).
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         example: "2026-02-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         required: true
 *         example: "2026-02-28T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: PDF report
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation failed
 */

/**
 * @openapi
 * /recommendations:
 *   post:
 *     tags: [Recommendations]
 *     summary: Save a recommendation
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             save:
 *               value:
 *                 title: "Cycle short distances"
 *                 body: "Try biking for trips under 3km to reduce emissions."
 *                 impact: "Positive"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *   get:
 *     tags: [Recommendations]
 *     summary: List saved recommendations
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
 *         name: search
 *         example: "cycle"
 *       - in: query
 *         name: impact
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High, Positive]
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /recommendations/{id}:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get a saved recommendation by id
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Recommendations]
 *     summary: Update a saved recommendation
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     tags: [Recommendations]
 *     summary: Delete a saved recommendation
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /recommendations/{id}/feedback:
 *   patch:
 *     tags: [Recommendations]
 *     summary: Provide feedback / update workflow status for a saved recommendation
 *     description: Supports marking as done, dismissing for N days, or rating as useful/not useful.
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
 *           examples:
 *             done:
 *               value:
 *                 status: "done"
 *             dismiss:
 *               value:
 *                 dismissDays: 7
 *             rate:
 *               value:
 *                 rating: "useful"
 *                 feedbackNote: "This was realistic for my routine"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Not found
 */

export default router;
