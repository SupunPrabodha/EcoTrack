# EcoTrack — PDF Reports

This document describes the **server-generated PDF reports** added for (1) end users and (2) admins.

## 1) User Report — Saved Recommendations (PDF)

**Purpose**: Provide a professional, downloadable report summarizing the user’s saved recommendations and feedback for a selected date range.

**Endpoint**: `GET /api/recommendations/report`

**Auth**: Required (`cookieAuth` or `bearerAuth`).

**Query Parameters**:
- `from` (required): ISO datetime
- `to` (required): ISO datetime

**Response**:
- `200 OK`
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="...pdf"`

**What the PDF includes (high-level)**:
- Report context (date range, generated timestamp)
- Summary KPIs (counts and basic rates)
- Recent saved recommendations (sample of items)

**Frontend UI**:
- Recommendations page provides a **“Download PDF report”** button that uses the selected date range.

## 2) Admin Report — Recommendation Effectiveness (PDF)

**Purpose**: Provide an admin-only report for global recommendation effectiveness, grouped by `ruleId`, suitable for demos and rubric evidence.

**Endpoint**: `GET /api/admin/reports/recommendations`

**Auth / RBAC**: Required + `admin` role.

**Query Parameters**:
- `from` (optional): ISO datetime
- `to` (optional): ISO datetime
- `limit` (optional): number of rule groups to include (defaults to `20`)

**Response**:
- `200 OK`
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="...pdf"`
- `403 Forbidden` if the caller is not an admin.

**What the PDF includes (high-level)**:
- Report context (date range, generated timestamp)
- Summary totals (saved/done/dismissed/useful counts)
- Effectiveness table by `ruleId` (rates + averages)

**Frontend UI**:
- Admin Analytics page provides a **“Download PDF report”** button for the selected date range.

## Security & Privacy Notes

- Reports are generated **on-demand** and returned as a download.
- User report is scoped to the authenticated user.
- Admin report requires RBAC (admin-only).

## Demo Checklist (Viva-Friendly)

1) Login as a normal user.
2) Go to Recommendations → generate tips → save 1–2 tips → optionally mark one as Done / Useful.
3) Click **Download PDF report** (user report).
4) Login as admin.
5) Go to Admin Analytics → Recommendation effectiveness → click **Download PDF report** (admin report).

## Troubleshooting

- If download fails on a deployed frontend, verify `VITE_API_BASE_URL` points to the backend `/api` and cookies/CORS are configured correctly.
- If you see `403 Forbidden` on the admin report, ensure your token/cookie was issued after the user was promoted to `admin`.
