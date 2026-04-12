# EcoTrack Backend (Express + MongoDB)

This is the REST API for EcoTrack.

- API base: `/api`
- Swagger UI: `/api/docs`

## Requirements

- Node.js >= 20
- pnpm >= 10
- MongoDB connection string

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

Required:

- `MONGO_URI` (MongoDB connection string)
- `JWT_SECRET` (strong secret)

Recommended (local dev):

- `NODE_ENV=development`
- `CORS_ORIGINS=http://localhost:5173`
- `COOKIE_SECURE=false`
- `TRUST_PROXY=false`

Recommended (production with separate frontend hosting):

- `NODE_ENV=production`
- `TRUST_PROXY=true`
- `CORS_ORIGINS=https://eco-track-gamma.vercel.app/`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`

## Scripts

- `pnpm dev` — start with nodemon
- `pnpm start` — start server
- `pnpm test` — run unit + integration tests (Jest + Supertest)
- `pnpm perf` — run Artillery performance test

## Notes

- Auth supports both httpOnly cookie sessions and `Authorization: Bearer <token>`.
- Third-party integrations are optional; missing keys fall back gracefully.

Recommendations notes:

- `GET /api/recommendations/generate` supports optional `lat`, `lon`, and `region` query params for local weather/air quality and grid-intensity context.
- `POST /api/recommendations/digest` emails a short digest of top recommendations (disabled in automated tests).
- Auto-personalization env knobs:
	- `RECOMMENDATION_AUTO_EXCLUDE_NOT_USEFUL_COUNT`
	- `RECOMMENDATION_AUTO_EXCLUDE_LOOKBACK_DAYS`
	- `RECOMMENDATION_OBSERVED_IMPACT_WINDOW_DAYS`
