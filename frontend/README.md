# EcoTrack (Frontend)

EcoTrack is a sustainability web app for habit tracking, emissions analytics, goals/accountability, and eco recommendations.

## Requirements

- Node.js `>=20`
- pnpm `>=10`

## Environment

Create a `.env` based on `.env.example`.

- `VITE_API_BASE_URL`
	- Local dev (recommended): `/api` (Vite proxies to the backend)
	- Same-host deployment: `/api`
	- Separate hosting: `https://your-backend.example.com/api`

## Run locally

1) Start the backend first (see `backend/.env.example`).

2) Start the frontend:

- `pnpm install`
- `pnpm dev`

App: `http://localhost:5173/`

## Admin login (RBAC demo)

The admin UI is at `http://localhost:5173/admin` and is only accessible to users with role `admin`.

### 1) Create an account

- Open `http://localhost:5173/login`
- Register a new account (any email/password)

### 2) Bootstrap the first admin (dev/demo only)

In `backend/.env`, enable bootstrapping and set a token:

- `ALLOW_BOOTSTRAP_ADMIN=true`
- `BOOTSTRAP_ADMIN_TOKEN=...`

Then call the bootstrap endpoint once (it only works if no admin exists yet):

- `POST http://localhost:5000/api/admin/bootstrap`
	- Body: `{ "email": "your_email", "token": "YOUR_BOOTSTRAP_ADMIN_TOKEN" }`

### 3) Log in and open the admin page

- Log in normally via the UI
- The Navbar will show an **Admin** link for admins
- Visit `http://localhost:5173/admin`

## Production build

- `pnpm build`
- `pnpm preview`

## Deployment notes (cookies + CORS)

The frontend uses cookie-based auth (`withCredentials: true`). If your frontend and backend are on different domains:

- Backend must set `CORS_ORIGINS` to include the frontend origin.
- Backend must use HTTPS and set `COOKIE_SECURE=true` so cookies can be sent with `SameSite=None`.
