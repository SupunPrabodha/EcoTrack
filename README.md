# EcoTrack

EcoTrack is a full-stack sustainability web application built for SE3040 (Application Frameworks) with a secure Express REST API and a React frontend.

Core components (minimum 4 as required):

- Habits (CRUD + date-range filtering)
- Emissions (CRUD + analytics)
- Goals (CRUD + progress evaluation + optional email alerts)
- Recommendations (generate + saved CRUD)

Supporting components:

- Auth (register/login/logout/me)
- Admin (RBAC + analytics + user management)
- Map (third-party/context endpoints)
- Health checks

## Tech Stack

- Backend: Node.js (ESM), Express, MongoDB/Mongoose, JWT (cookie + optional Bearer), Zod validation, Swagger UI
- Frontend: React (Vite), React Router, Axios, Context API, Tailwind CSS
- Testing: Jest + Supertest (backend), Vitest + React Testing Library (frontend)
- Performance: Artillery

## Architecture (Best Practice)

Layered architecture:

1) Routes (HTTP contracts + validation)
2) Controllers (request/response handling)
3) Services (business logic + third-party integrations)
4) Models (MongoDB persistence)
5) Middlewares (auth, RBAC, validation, errors, rate limiting)

## Setup Instructions

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- MongoDB connection string

### Backend (Local)

1) Create `backend/.env` from `backend/.env.example`
2) Install and run:

```bash
cd backend
pnpm install
pnpm dev
```

- API base: `http://localhost:5000/api`
- Swagger UI: `http://localhost:5000/api/docs`

### Frontend (Local)

1) Create `frontend/.env` from `frontend/.env.example`
2) Install and run:

```bash
cd frontend
pnpm install
pnpm dev
```

- App: `http://localhost:5173/`

Note: In development, Vite proxies `/api` to the backend.

## API Endpoint Documentation (Rubric)

Swagger UI is available at `/api/docs` and includes request examples.

Authentication:

- Browser sessions use an httpOnly cookie (frontend uses Axios `withCredentials: true`).
- API clients may use `Authorization: Bearer <token>`.

Base URL (local): `http://localhost:5000/api`

## Postman Guide (Optional)

You can test the API using Postman (recommended for viva demos).

### 1) Create a Postman Environment

Create an environment variable:

- `baseUrl`
  - Local: `http://localhost:5000/api`
  - Deployed: `https://<your-render-app>.onrender.com/api`

### 2) Authentication flow (cookie-based)

EcoTrack’s frontend and Postman flow is cookie-based:

1) `POST {{baseUrl}}/auth/register`
   - Body (JSON):
     ```json
     { "name": "Alex", "email": "alex@example.com", "password": "Password123!" }
     ```
   - Expected:
     - `201 Created`

2) `POST {{baseUrl}}/auth/login`
   - Body (JSON):
     ```json
     { "email": "alex@example.com", "password": "Password123!" }
     ```
   - Expected:
     - `200 OK`
     - Response sets an httpOnly cookie (Postman will store it for the domain)

3) `GET {{baseUrl}}/auth/me`
   - Expected:
     - `200 OK` with your current user

Notes:

- No extra headers are required in Postman if the cookie is stored.
- If testing against deployed frontend + backend on different domains, CORS/cookie settings must be correct (see Deployment section).

### 3) Example CRUD calls (Protected)

After login, try these:

- Create a habit
  - `POST {{baseUrl}}/habits`
  - Body (JSON):
    ```json
    { "type": "car_km", "value": 12, "date": "2026-02-14T10:00:00.000Z" }
    ```
  - Expected: `201 Created`

- List habits (pagination + date range)
  - `GET {{baseUrl}}/habits?page=1&limit=10&from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.999Z`
  - Expected: `200 OK`

- Generate recommendations
  - `GET {{baseUrl}}/recommendations/generate?from=2026-02-01T00:00:00.000Z&to=2026-02-15T23:59:59.999Z`
  - Expected: `200 OK` with a list of generated tips

- Feedback workflow for saved recommendations (mark done / dismiss / rate)
  1) Save a recommendation you like
     - `POST {{baseUrl}}/recommendations`
  2) Update its workflow/feedback
     - `PATCH {{baseUrl}}/recommendations/:id/feedback`
     - Body examples (JSON):
       - Mark as done: `{ "status": "done" }`
       - Dismiss 7 days: `{ "dismissDays": 7 }`
       - Rate useful: `{ "rating": "useful" }`

### 4) Admin-only endpoints

Admin endpoints require a user with role `admin`.

- Demo bootstrap (dev/demo only): `POST {{baseUrl}}/admin/bootstrap`
- After admin exists, use:
  - `GET {{baseUrl}}/admin/users`
  - `PATCH {{baseUrl}}/admin/users/:id/role`

### 5) Common errors you can explain in viva

- `401 Unauthorized`: not logged in / cookie missing
- `403 Forbidden`: logged in, but role not allowed (RBAC)
- `400 Validation failed`: Zod validation blocked invalid data

### Auth (`/auth`)

- `POST /auth/register` (Public) — register user
- `POST /auth/login` (Public) — login, sets auth cookie
- `POST /auth/logout` (Public) — clears auth cookie
- `GET /auth/me` (Protected) — current user identity

### Habits (`/habits`) (Protected)

- `POST /habits` — create habit
- `GET /habits` — list habits (pagination + date range)
- `GET /habits/:id` — get habit
- `PUT|PATCH /habits/:id` — update habit
- `DELETE /habits/:id` — delete habit

### Emissions (`/emissions`) (Protected)

- `POST /emissions` — create emission entry
- `GET /emissions` — list emissions (pagination/filter/search)
- `GET /emissions/:id` — get emission entry
- `PUT|PATCH /emissions/:id` — update emission entry
- `DELETE /emissions/:id` — delete emission entry
- `GET /emissions/summary` — analytics summary
- `GET /emissions/trends` — analytics trends

### Goals (`/goals`) (Protected)

- `POST /goals` — create goal
- `GET /goals` — list goals (pagination/filter)
- `GET /goals/:id` — get goal
- `PUT|PATCH /goals/:id` — update goal
- `DELETE /goals/:id` — delete goal
- `GET /goals/:id/evaluate` — evaluate goal progress

### Recommendations (`/recommendations`) (Protected)

- `GET /recommendations/generate?from=...&to=...` — generate recommendations
- `POST /recommendations` — save a recommendation
- `GET /recommendations` — list saved recommendations (pagination + search + impact filter)
- `GET /recommendations/:id` — get saved recommendation
- `PUT /recommendations/:id` — update saved recommendation
- `PATCH /recommendations/:id/feedback` — update status/dismiss/rating for a saved recommendation
- `DELETE /recommendations/:id` — delete saved recommendation

## How to Check (Recommendation Upgrades)

Frontend (UI):

- Go to Recommendations → Generate.
- Tips may show an “Estimated impact” line (kg CO2e) when enough data exists.
- Save a tip, then in the Saved section use: `Done`, `Dismiss 7d`, `Useful`, `Not useful`.
- The saved card shows `Status` and (when dismissed) the `dismissedUntil` date.
- Open “Why was this suggested?” → shows `Confidence` and `Data used` (habits/weather/goals).
- Cooldown: the generator won’t repeat the same `ruleId` for a few days (default 7) and will respect dismissals.

Backend (API):

- Use Postman:
  - `GET /recommendations/generate?from=...&to=...`
  - `PATCH /recommendations/:id/feedback` with the examples above.

## Viva Evidence Checklist (Suggested)

- Screenshot: Recommendations → Generate shows at least one tip with “Estimated impact”.
- Screenshot: Save a tip → it appears under “Saved Recommendations”.
- Screenshot: Click `Dismiss 7d` → item disappears from the saved list (hidden until expiry).
- Screenshot: Click `Useful` / `Not useful` → saved items reorder (useful first).
- Screenshot: Swagger UI shows `PATCH /recommendations/{id}/feedback`.
- Test proof: `cd backend; pnpm test` passing (include terminal output).

### Admin (`/admin`) (Mixed: bootstrap public, rest admin-only)

- `POST /admin/bootstrap` (Public but server-gated) — bootstrap first admin (demo only)
- `GET /admin/users` (Admin) — list users
- `PATCH /admin/users/:id/role` (Admin) — change role
- `GET /admin/analytics/emissions` (Admin) — global emissions analytics
- `GET /admin/leaderboard/emissions` (Admin) — leaderboard
- `GET /admin/analytics/goals` (Admin) — goal performance analytics

### Health (`/health`) (Public)

- `GET /health` — service health
- `GET /health/integrations` — third-party integration status (best-effort)

## Third-Party APIs (Additional Feature)

All third-party integrations are optional. If keys are missing/invalid, the app continues to work with safe fallbacks.

- OpenWeather (weather context for recommendations)
- Climatiq (emission estimation)
- Carbon Intensity (grid intensity fallback)
- SendGrid or Brevo (goal alert emails)

## Deployment Report (Rubric)

### Live URLs (fill for final submission)

- Backend API: `<paste deployed backend API URL>`
- Swagger UI: `<paste deployed swagger URL>`
- Frontend App: `<paste deployed frontend URL>`

### Backend Deployment (Render/Railway)

1) Create a new service from the `backend/` directory
2) Build command: `pnpm install`
3) Start command: `pnpm start`
4) Environment variables (do NOT commit secrets):

- Required:
  - `NODE_ENV=production`
  - `MONGO_URI=<masked>`
  - `JWT_SECRET=<masked>`
- If frontend is on a different domain (Vercel/Netlify):
  - `TRUST_PROXY=true`
  - `CORS_ORIGINS=https://<your-frontend-domain>`
  - `COOKIE_SECURE=true`
  - `COOKIE_SAMESITE=none`

Verify:

- `GET https://<backend>/api/health`
- Swagger: `https://<backend>/api/docs`

### Frontend Deployment (Vercel/Netlify)

1) Create a new project from the `frontend/` directory
2) Build command: `pnpm build`
3) Output directory: `dist`
4) Environment variables:

- `VITE_API_BASE_URL=https://<your-backend-domain>/api`

### Evidence (Screenshots)

Include screenshots showing:

- Swagger UI working (`/api/docs`)
- Frontend home/login page
- A protected feature working after login (e.g., Dashboard or Habits)

## Testing Instruction Report (Rubric)

### Backend (Unit + Integration)

```bash
cd backend
pnpm install
pnpm test
```

Notes:

- Tests use Jest + Supertest and cover routes/services.

### Frontend (Unit tests)

```bash
cd frontend
pnpm install
pnpm test:run
```

### Performance Testing (Artillery)

```bash
cd backend
pnpm dev
```

In another terminal:

```bash
cd backend
pnpm perf
```

The Artillery scenario simulates: register → login → health → analytics → recommendation generation.

## Repository Layout

- `backend/` Express REST API, Swagger, tests, Artillery
- `frontend/` React UI, tests
