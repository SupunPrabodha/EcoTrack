import request from "supertest";
import { registerAndLogin, setupTestApp, teardownTestApp } from "./testUtils.js";

let app;
let mongo;
let cookie;

beforeAll(async () => {
  const setup = await setupTestApp();
  mongo = setup.mongo;
  app = setup.app;
  cookie = await registerAndLogin(app);
});

afterAll(async () => {
  await teardownTestApp(mongo);
});

function pdfParser(res, callback) {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

function monthString(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

test("monthly report returns summary + trends", async () => {
  // Use previous month to avoid partial month edge cases.
  const now = new Date();
  const reportMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10));
  const month = monthString(reportMonthDate);

  // Create a couple of manual emission entries inside that month.
  const e1 = new Date(Date.UTC(reportMonthDate.getUTCFullYear(), reportMonthDate.getUTCMonth(), 5, 12));
  const e2 = new Date(Date.UTC(reportMonthDate.getUTCFullYear(), reportMonthDate.getUTCMonth(), 15, 12));

  await request(app)
    .post("/api/emissions")
    .set("Cookie", cookie)
    .send({
      sourceType: "manual",
      emissionKg: 10,
      notes: "monthly report test 1",
      date: e1.toISOString(),
    });

  await request(app)
    .post("/api/emissions")
    .set("Cookie", cookie)
    .send({
      sourceType: "manual",
      emissionKg: 5,
      notes: "monthly report test 2",
      date: e2.toISOString(),
    });

  const res = await request(app)
    .get("/api/reports/monthly")
    .set("Cookie", cookie)
    .query({ month });

  expect(res.status).toBe(200);
  expect(res.body?.data?.month).toBe(month);
  expect(Number(res.body?.data?.summary?.totalKg ?? 0)).toBeGreaterThan(0);
  expect(Array.isArray(res.body?.data?.trends)).toBe(true);
  expect(["high", "low"]).toContain(res.body?.data?.level);
  expect(typeof res.body?.data?.feedback).toBe("string");
});

test("GET /api/reports/monthly/pdf returns a PDF attachment", async () => {
  // Use previous month to avoid partial month edge cases.
  const now = new Date();
  const reportMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10));
  const month = monthString(reportMonthDate);

  const res = await request(app)
    .get("/api/reports/monthly/pdf")
    .set("Cookie", cookie)
    .query({ month })
    .buffer(true)
    .parse(pdfParser);

  expect(res.status).toBe(200);
  expect(String(res.headers["content-type"] || "")).toContain("application/pdf");
  expect(String(res.headers["content-disposition"] || "")).toContain("attachment");
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(100);
});

test("GET /api/recommendations/report returns a PDF attachment", async () => {
  const from = new Date("2026-02-01T00:00:00.000Z");
  const to = new Date("2026-02-28T23:59:59.999Z");

  const res = await request(app)
    .get("/api/recommendations/report")
    .set("Cookie", cookie)
    .query({ from: from.toISOString(), to: to.toISOString() })
    .buffer(true)
    .parse(pdfParser);

  expect(res.status).toBe(200);
  expect(String(res.headers["content-type"] || "")).toContain("application/pdf");
  expect(String(res.headers["content-disposition"] || "")).toContain("attachment");
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(100);
});

test("GET /api/admin/reports/recommendations rejects non-admin", async () => {
  const res = await request(app)
    .get("/api/admin/reports/recommendations")
    .set("Cookie", cookie)
    .query({ limit: 5 });

  expect(res.status).toBe(403);
});

test("GET /api/admin/reports/recommendations returns a PDF attachment for admin", async () => {
  process.env.ALLOW_BOOTSTRAP_ADMIN = "true";
  process.env.BOOTSTRAP_ADMIN_TOKEN = "bootstrap-test-token";

  const email = "admin_reports@example.com";
  const password = "Password123!";

  await request(app).post("/api/auth/register").send({
    name: "Admin Reports",
    email,
    password,
  });

  const boot = await request(app).post("/api/admin/bootstrap").send({
    email,
    token: "bootstrap-test-token",
  });
  expect(boot.status).toBe(200);

  const login = await request(app).post("/api/auth/login").send({ email, password });
  const adminCookie = login.headers["set-cookie"];
  expect(adminCookie).toBeTruthy();

  const res = await request(app)
    .get("/api/admin/reports/recommendations")
    .set("Cookie", adminCookie)
    .query({ limit: 5 })
    .buffer(true)
    .parse(pdfParser);

  expect(res.status).toBe(200);
  expect(String(res.headers["content-type"] || "")).toContain("application/pdf");
  expect(String(res.headers["content-disposition"] || "")).toContain("attachment");
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(100);

  delete process.env.ALLOW_BOOTSTRAP_ADMIN;
  delete process.env.BOOTSTRAP_ADMIN_TOKEN;
});
