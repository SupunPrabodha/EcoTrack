# Recommendations — Rubric Alignment & Evidence

This document maps the EcoTrack recommendation system to common SE3040-style rubric criteria (functionality, architecture, validation, security, testing, documentation).

## 1) Core functionality (generate + CRUD)

- **Generate tips for a date range**
  - Endpoint: `GET /api/recommendations/generate?from=...&to=...`
  - Route + validation: backend/src/routes/recommendations.routes.js
  - Controller: backend/src/controllers/recommendations.controller.js
  - Business logic: backend/src/services/recommendation.service.js (`buildRecommendations`)

- **Saved recommendations CRUD**
  - Endpoints: `POST /api/recommendations`, `GET /api/recommendations`, `GET /api/recommendations/:id`, `PUT /api/recommendations/:id`, `DELETE /api/recommendations/:id`
  - Route + validation: backend/src/routes/recommendations.routes.js
  - Service methods: backend/src/services/recommendation.service.js (`saveRecommendation`, `listRecommendations`, `getRecommendation`, `updateRecommendation`, `deleteRecommendation`)

## 2) Real-world workflow + feedback loop

- **Feedback workflow (done / dismissed / rating)**
  - Endpoint: `PATCH /api/recommendations/:id/feedback`
  - Service: backend/src/services/recommendation.service.js (`updateRecommendationFeedback`)
  - Persisted fields: backend/src/models/Recommendation.js (`status`, `dismissedUntil`, `rating`, `feedbackNote`, `audit`)

- **Ranking + suppression behavior**
  - Useful-first ordering + hide active dismissals: backend/src/services/recommendation.service.js (`listRecommendations`)
  - Cooldown (suppresses recently saved/dismissed tips by stable `ruleId`): backend/src/services/recommendation.service.js (`buildRecommendations`)

## 3) Explainability (why, dataUsed, confidence)

- **Explainability fields**
  - Schema: backend/src/models/Recommendation.js (`evidence.why`, `evidence.dataUsed`, `confidence`, `evidence.estimatedKgSaved`)

- **Normalization (always provide non-empty explainability on save)**
  - Service: backend/src/services/recommendation.service.js (`saveRecommendation` ensures `why` + `dataUsed` + `confidence`)

## 4) Personalization (user preferences)

- **Store preferences**: `PATCH /api/auth/me`
- **Read preferences**: `GET /api/auth/me`
- **Applied in generator**: backend/src/services/recommendation.service.js (filters by `diet`, `transportMode`, `excludedRuleIds`)

## 5) Admin analytics & reporting (rubric “advanced features”)

- **Effectiveness analytics by ruleId**
  - Endpoint: `GET /api/admin/analytics/recommendations`
  - Route + validation: backend/src/routes/admin.routes.js
  - Controller: backend/src/controllers/admin.controller.js
  - Aggregation logic: backend/src/services/admin.service.js

- **PDF reports**
  - User report endpoint: `GET /api/recommendations/report?from=...&to=...`
  - Admin report endpoint: `GET /api/admin/reports/recommendations?from=...&to=...&limit=...`
  - PDF rendering + premium styling: backend/src/services/report.service.js and backend/src/utils/pdf.js
  - Professional report documentation: REPORTS.md

## 6) Architecture / best practice alignment

Layered architecture is followed throughout:

- **Routes**: backend/src/routes/recommendations.routes.js
- **Controllers**: backend/src/controllers/recommendations.controller.js
- **Services**: backend/src/services/recommendation.service.js
- **Models**: backend/src/models/Recommendation.js
- **Middlewares**: backend/src/middlewares/auth.js, backend/src/middlewares/validate.js

## 7) Security & validation

- **Protected endpoints**: recommendations routes are behind auth middleware (cookie or Bearer JWT)
  - backend/src/routes/recommendations.routes.js (`router.use(requireAuth)`)

- **Input validation**
  - Zod schemas on all recommendation endpoints: backend/src/routes/recommendations.routes.js

- **RBAC for admin endpoints**
  - backend/src/routes/admin.routes.js (`requireRole("admin")`)

## 8) Testing methods (evidence)

### Backend — unit/service level
- backend/tests/recommendation.service.test.js

### Backend — integration/route level (Supertest)
- backend/tests/recommendations.test.js
  - Generator behaviors: goals, cooldown, preferences
  - Save normalization for explainability
  - Feedback lifecycle + ranking + hide/unhide dismissals
  - CRUD get/update/delete + ownership

### Admin analytics tests
- backend/tests/admin.recommendations.analytics.test.js

### Report endpoint tests (PDF)
- backend/tests/reports.test.js

### Performance / load testing (Artillery)
- Script: `cd backend && pnpm perf`
- Scenario: backend/artillery/load.yml (includes `GET /api/recommendations/generate`)

### Frontend tests
- Example tests exist using Vitest + React Testing Library
  - frontend/src/pages/Login.test.jsx
  - frontend/src/auth/ProtectedRoute.test.jsx

## 9) Quick viva/demo checklist

- Generate tips for a given range (show stable `ruleId`, explainability, goal-aware ordering)
- Save a tip, then mark `done`, `dismiss 7d`, rate `useful`/`not_useful`
- Show cooldown effect by regenerating (same `ruleId` suppressed)
- Update preferences via `PATCH /auth/me` and show generator respects it
- Admin: show analytics endpoint + admin PDF report
- Test proof: `cd backend && pnpm test` (all green)
- Perf proof: `cd backend && pnpm perf` (Artillery report)
