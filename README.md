# EcoTrack

EcoTrack is a full-stack sustainability platform designed for coursework-grade, production-style engineering:

- Habit Tracking (CRUD)
- Emissions Tracking + Analytics (CRUD + summary)
- Goals & Accountability (CRUD + evaluation + optional email alerts)
- Recommendations (generation + saved CRUD)

## Tech Stack

- Backend: Node.js (ESM), Express, MongoDB/Mongoose, JWT (cookie + bearer), Zod validation, Swagger UI
- Frontend: React (Vite), Axios, React Router

## Functional Requirements (Implemented)

- Auth: register/login/logout/me with JWT protection
- Role-based access control: `admin` endpoints for user management
- 4 core business components with RESTful APIs:
  - Habits
  - Emissions
  - Goals
  - Recommendations

## Non-Functional Requirements (Implemented)

- Security: Helmet, rate limiting, cookie hardening, CORS allowlist
- Reliability: centralized error handling, request validation, third-party timeouts + safe fallbacks
- Documentation: Swagger `/api/docs` with examples
- Testing: Jest + Supertest integration tests (backend)

## Third-Party APIs (Configured in Service Layer)

These are optional but recommended to meet the rubric for “meaningful third-party integration”. If keys are missing, EcoTrack continues to work with safe fallbacks.

- OpenWeather: recommendations context
- Carbon Interface: emissions estimation (best-effort for supported habit types)
- Carbon Intensity: electricity grid carbon intensity fallback
- SendGrid: goal alert emails (sandbox supported)
- Brevo (Sendinblue): goal alert emails (alternative to SendGrid)

## Local Development

### Backend

1) Create `backend/.env` based on `backend/.env.example`

Minimum required variables for backend:

- `MONGO_URI`
- `JWT_SECRET`

Recommended for local dev:

- `COOKIE_SECURE=false`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`
- `TRUST_PROXY=false`
2) Install + run:

- `cd backend`
- `pnpm install`
- `pnpm dev`

Swagger UI: `http://localhost:5000/api/docs`

### Frontend

1) Create `frontend/.env` based on `frontend/.env.example`
2) Install + run:

- `cd frontend`
- `pnpm install`
- `pnpm dev`

App: `http://localhost:5173/`

Vite is configured to proxy `/api` to the backend, so the frontend can use `VITE_API_BASE_URL=/api` in development.

## JWT authentication (cookie + bearer)

EcoTrack supports:

- Browser auth via an httpOnly cookie (default, used by the frontend)
- API clients via `Authorization: Bearer <token>`

Backend variables relevant to JWT/cookies:

- `JWT_SECRET` (required)
- `JWT_EXPIRES_IN` (e.g. `7d`, `12h`, `30m`)
- `COOKIE_NAME` (default `accessToken`)
- `COOKIE_SECURE`:
  - `false` for local http
  - `true` for https (required when `SameSite=None`)
- `COOKIE_SAMESITE` (optional override; if empty it is derived from `COOKIE_SECURE`)
- `COOKIE_DOMAIN` (optional; usually leave empty)

If frontend and backend are on different domains:

- Use HTTPS
- Set `COOKIE_SECURE=true`
- Set backend `CORS_ORIGINS` to include the exact frontend origin
- Set `TRUST_PROXY=true` when behind Render/NGINX

## Third-party API keys (optional)

All third-party integrations are optional. If you leave keys empty, EcoTrack still works with safe fallbacks.

- OpenWeather (recommendations context)
  - `OPENWEATHER_API_KEY`
  - `OPENWEATHER_CITY`
- Carbon Interface (best-effort emissions estimation)
  - `CARBON_INTERFACE_API_KEY`
  - `CARBON_INTERFACE_ELECTRICITY_COUNTRY`
  - `CARBON_INTERFACE_VEHICLE_MODEL_ID` (only needed for certain estimates)
- Carbon Intensity (grid intensity fallback)
  - `CARBON_INTENSITY_BASE_URL`
  - `CARBON_INTENSITY_REGION`
- SendGrid (goal alert emails)
  - `SENDGRID_API_KEY`
  - `SENDGRID_FROM_EMAIL`
  - `SENDGRID_SANDBOX_MODE=true` (recommended for demos)

- Brevo / Sendinblue (goal alert emails - alternative)
  - `BREVO_API_KEY`
  - `BREVO_SENDER_EMAIL`
  - `BREVO_SENDER_NAME`
  - Optional: `EMAIL_PROVIDER=brevo` (or `sendgrid`)

Note: EmailJS is usually better suited for client-side contact forms. For server-side transactional alerts (like goal alerts), Brevo/SendGrid is more appropriate because the email API key stays on the server.

## Hosting / Deployment (Host-Ready Notes)

This section is intended to be used as the **Deployment Report** for the SE3040 submission.

### Backend deployment (Render/Railway)

1) Create a new service from the `backend/` folder
2) Set build + start commands
  - Build: `pnpm install`
  - Start: `pnpm start`
3) Add environment variables (do not expose secrets in the repo)
  - Required: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`
  - Cookie/CORS (when frontend is on a different domain):
    - `TRUST_PROXY=true`
    - `CORS_ORIGINS=https://<your-frontend-domain>`
    - `COOKIE_SECURE=true`
    - `COOKIE_SAMESITE=none`
4) Verify
  - `GET https://<backend>/api/health`
  - Swagger: `https://<backend>/api/docs`

### Backend

- Set `NODE_ENV=production`
- Set a strong `JWT_SECRET`
- Set `TRUST_PROXY=true` when behind a reverse proxy (Render/NGINX)
- If frontend and backend are on different domains:
- If frontend and backend are on different domains:
  - Set `CORS_ORIGINS` to the exact frontend origin
  - Use HTTPS and set `COOKIE_SECURE=true`
  - Set `COOKIE_SAMESITE=none`
  - Set `TRUST_PROXY=true` (Render/NGINX)

### Frontend

- Set `VITE_API_BASE_URL`:

### Frontend deployment (Vercel/Netlify)

1) Create a new frontend project from the `frontend/` folder
2) Set build command: `pnpm build`
3) Set output dir: `dist`
4) Add environment variables
  - `VITE_API_BASE_URL=https://<your-backend-domain>/api`
5) Verify
  - Login/Register works
  - Protected routes work (Dashboard, Habits, Emissions, Map)

### Live URLs (fill for submission)

- Backend API: `<paste deployed backend API URL>`
- Swagger UI: `<paste deployed swagger URL>`
- Frontend App: `<paste deployed frontend URL>`

## Deployment Report (fill for final submission)

### Live URLs

- Backend API: `<paste deployed backend API URL>`
- Swagger UI: `<paste deployed swagger URL>`
- Frontend App: `<paste deployed frontend URL>`

### Platforms used

- Backend hosting: Render/Railway/Other: `<fill>`
- Frontend hosting: Vercel/Netlify/Other: `<fill>`

### Environment variables used (no secrets)

- Backend: `NODE_ENV`, `MONGO_URI` (masked), `JWT_SECRET` (masked), `CORS_ORIGINS`, `TRUST_PROXY`, `COOKIE_*`, and optional third-party keys.
- Frontend: `VITE_API_BASE_URL`

### Evidence

- Add screenshots of successful deployment (frontend home + swagger + a protected endpoint working).

## Testing Instructions (for rubric)

### Backend

- Install: `cd backend; pnpm install`
- Run tests (unit + integration): `pnpm test`

### Frontend (unit tests)

The frontend uses Vitest + React Testing Library.

- Run: `cd frontend; pnpm test:run`

### Performance testing (Artillery)

1) Start backend: `cd backend; pnpm dev`
2) In another terminal: `cd backend; pnpm perf`

The Artillery scenario registers + logs in a user, then hits analytics and recommendation endpoints to simulate realistic load.

Tip (Windows/PowerShell): if you see execution policy prompts, run `pnpm.cmd perf`.

## Repo Layout

- `backend/` Express API + Swagger
- `frontend/` React UI
