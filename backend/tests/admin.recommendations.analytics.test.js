import request from "supertest";
import { setupTestApp, teardownTestApp, registerAndLogin } from "./testUtils.js";
import { User } from "../src/models/User.js";
import { Recommendation } from "../src/models/Recommendation.js";

let app;
let mongo;

beforeAll(async () => {
  // Enable bootstrap for this test run only
  process.env.ALLOW_BOOTSTRAP_ADMIN = "true";
  process.env.BOOTSTRAP_ADMIN_TOKEN = "bootstrap-test-token";

  const setup = await setupTestApp();
  mongo = setup.mongo;
  app = setup.app;
});

afterAll(async () => {
  await teardownTestApp(mongo);
  delete process.env.ALLOW_BOOTSTRAP_ADMIN;
  delete process.env.BOOTSTRAP_ADMIN_TOKEN;
});

test("GET /api/admin/analytics/recommendations is admin-only and aggregates by ruleId", async () => {
  // Normal user
  const userCookie = await registerAndLogin(app, { email: "normal_user@example.com" });
  const normalRes = await request(app)
    .get("/api/admin/analytics/recommendations")
    .set("Cookie", userCookie);
  expect(normalRes.status).toBe(403);

  // Admin user via bootstrap
  await request(app).post("/api/auth/register").send({
    name: "Admin",
    email: "admin_analytics@example.com",
    password: "Password123!",
  });
  const boot = await request(app).post("/api/admin/bootstrap").send({
    email: "admin_analytics@example.com",
    token: "bootstrap-test-token",
  });
  expect(boot.status).toBe(200);

  const adminLogin = await request(app).post("/api/auth/login").send({
    email: "admin_analytics@example.com",
    password: "Password123!",
  });
  const adminCookie = adminLogin.headers["set-cookie"];

  const normalUser = await User.findOne({ email: "normal_user@example.com" }).lean();
  const adminUser = await User.findOne({ email: "admin_analytics@example.com" }).lean();

  // Seed some saved recommendations with different outcomes
  await Recommendation.create([
    {
      userId: normalUser._id,
      ruleId: "car_reduce",
      title: "Car tip",
      body: "Reduce car usage.",
      impact: "High",
      saved: true,
      status: "done",
      rating: "useful",
      evidence: { why: ["x"], estimatedKgSaved: 2 },
    },
    {
      userId: normalUser._id,
      ruleId: "car_reduce",
      title: "Car tip 2",
      body: "Reduce car usage again.",
      impact: "High",
      saved: true,
      status: "dismissed",
      rating: "not_useful",
      evidence: { why: ["x"], estimatedKgSaved: 1 },
    },
    {
      userId: adminUser._id,
      ruleId: "electricity_reduce",
      title: "Elec tip",
      body: "Reduce electricity.",
      impact: "Medium",
      saved: true,
      status: "saved",
      rating: "useful",
      evidence: { why: ["x"], estimatedKgSaved: 0.5 },
    },
  ]);

  const res = await request(app)
    .get("/api/admin/analytics/recommendations")
    .set("Cookie", adminCookie)
    .query({ limit: 10 });

  expect(res.status).toBe(200);
  expect(res.body?.success).toBe(true);

  const byRule = res.body?.data?.byRule || [];
  expect(Array.isArray(byRule)).toBe(true);

  const car = byRule.find((r) => r.ruleId === "car_reduce");
  const elec = byRule.find((r) => r.ruleId === "electricity_reduce");
  expect(car).toBeTruthy();
  expect(elec).toBeTruthy();

  expect(car.total).toBe(2);
  expect(car.done).toBe(1);
  expect(car.dismissed).toBe(1);
  expect(car.useful).toBe(1);
  expect(car.notUseful).toBe(1);
  expect(car.usefulRate).toBeCloseTo(0.5);
  expect(car.doneRate).toBeCloseTo(0.5);

  expect(elec.total).toBe(1);
  expect(elec.saved).toBe(1);
  expect(elec.useful).toBe(1);
});
