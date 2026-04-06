import request from "supertest";
import { registerAndLogin, setupTestApp, teardownTestApp } from "./testUtils.js";
import { User } from "../src/models/User.js";
import { Recommendation } from "../src/models/Recommendation.js";
import { Goal } from "../src/models/Goal.js";
import { EmissionEntry } from "../src/models/EmissionEntry.js";
import { Habit } from "../src/models/Habit.js";

let app;
let mongo;
let cookie;
let otherCookie;
let userId;

beforeAll(async () => {
  const setup = await setupTestApp();
  mongo = setup.mongo;
  app = setup.app;

  cookie = await registerAndLogin(app, { email: "rec_tester@example.com" });
  otherCookie = await registerAndLogin(app, { email: "other_user@example.com" });

  const user = await User.findOne({ email: "rec_tester@example.com" }).lean();
  userId = user?._id;
});

afterAll(async () => {
  await teardownTestApp(mongo);
});

test("PATCH /api/recommendations/:id/feedback updates status/rating/dismiss", async () => {
  const saved = await Recommendation.create({
    userId,
    title: "Test rec",
    body: "Try something that reduces emissions.",
    impact: "Medium",
    saved: true,
    evidence: { why: ["test"] },
  });

  const res = await request(app)
    .patch(`/api/recommendations/${saved._id}/feedback`)
    .set("Cookie", cookie)
    .send({ status: "done", rating: "useful", dismissDays: 7, feedbackNote: "nice" });

  expect(res.status).toBe(200);

  const updated = await Recommendation.findById(saved._id).lean();
  expect(updated.status).toBe("dismissed");
  expect(updated.rating).toBe("useful");
  expect(updated.feedbackNote).toBe("nice");
  expect(updated.dismissedUntil).toBeTruthy();
  expect(Array.isArray(updated.audit)).toBe(true);
  expect(updated.audit.length).toBeGreaterThan(0);
});

test("PATCH /api/recommendations/:id/feedback enforces ownership", async () => {
  const saved = await Recommendation.create({
    userId,
    title: "Owner rec",
    body: "Try something that reduces emissions.",
    impact: "Low",
    saved: true,
    evidence: { why: ["test"] },
  });

  const res = await request(app)
    .patch(`/api/recommendations/${saved._id}/feedback`)
    .set("Cookie", otherCookie)
    .send({ status: "done" });

  expect(res.status).toBe(404);
});

test("GET /api/recommendations/generate includes goal tip when goal exceeded", async () => {
  const from = new Date("2025-01-01T00:00:00.000Z");
  const to = new Date("2025-01-31T23:59:59.000Z");

  await Goal.create({
    userId,
    title: "Monthly limit",
    maxKg: 10,
    startDate: from,
    endDate: to,
    status: "active",
    period: "monthly",
  });

  await EmissionEntry.create({
    userId,
    sourceType: "manual",
    emissionKg: 12,
    date: new Date("2025-01-10T12:00:00.000Z"),
    notes: "seed",
  });

  const res = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", cookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);

  const tips = res.body?.data?.tips || [];
  expect(Array.isArray(tips)).toBe(true);

  const goalTip = tips.find((t) => t.ruleId === "goal_progress");
  expect(goalTip).toBeTruthy();
});

test("POST /api/recommendations normalizes explainability (why + dataUsed + confidence)", async () => {
  const from = new Date("2026-02-01T00:00:00.000Z");
  const to = new Date("2026-02-07T23:59:59.000Z");

  const res = await request(app)
    .post("/api/recommendations")
    .set("Cookie", cookie)
    .send({
      ruleId: "car_reduce",
      title: "Test save",
      body: "Try reducing your car usage for a week.",
      impact: "Medium",
      context: { range: { from: from.toISOString(), to: to.toISOString() } },
      evidence: {
        // intentionally omit why
        range: { from: from.toISOString(), to: to.toISOString() },
        habits: { car_km: { totalValue: 100, totalKg: 20 } },
      },
    });

  expect(res.status).toBe(201);
  const saved = res.body?.data;
  expect(saved).toBeTruthy();
  expect(saved.confidence).toBeDefined();
  expect(["low", "medium", "high"]).toContain(saved.confidence);
  expect(Array.isArray(saved?.evidence?.why)).toBe(true);
  expect(saved.evidence.why.length).toBeGreaterThan(0);
  expect(saved?.evidence?.dataUsed?.sources?.length).toBeGreaterThan(0);
});

test("GET /api/recommendations ranks useful first and hides active dismissals", async () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const useful = await Recommendation.create({
    userId,
    title: "Useful rec",
    body: "Something good.",
    impact: "Low",
    saved: true,
    status: "saved",
    rating: "useful",
    evidence: { why: ["x"] },
  });

  const notUseful = await Recommendation.create({
    userId,
    title: "Not useful rec",
    body: "Something else.",
    impact: "Low",
    saved: true,
    status: "saved",
    rating: "not_useful",
    evidence: { why: ["x"] },
  });

  const dismissed = await Recommendation.create({
    userId,
    title: "Dismissed rec",
    body: "Hidden for now.",
    impact: "Low",
    saved: true,
    status: "dismissed",
    dismissedUntil: future,
    evidence: { why: ["x"] },
  });

  const res = await request(app).get("/api/recommendations").set("Cookie", cookie).query({ page: 1, limit: 10 });
  expect(res.status).toBe(200);
  const items = res.body?.data?.items || [];

  // dismissed with future dismissedUntil should be hidden
  expect(items.some((r) => String(r._id) === String(dismissed._id))).toBe(false);

  // useful should rank above not_useful
  const idxUseful = items.findIndex((r) => String(r._id) === String(useful._id));
  const idxNotUseful = items.findIndex((r) => String(r._id) === String(notUseful._id));
  expect(idxUseful).toBeGreaterThanOrEqual(0);
  expect(idxNotUseful).toBeGreaterThanOrEqual(0);
  expect(idxUseful).toBeLessThan(idxNotUseful);
});

test("Dismissed items reappear after expiry (auto-reset)", async () => {
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const dismissed = await Recommendation.create({
    userId,
    title: "Dismissed expired",
    body: "Should reappear.",
    impact: "Low",
    saved: true,
    status: "dismissed",
    dismissedUntil: past,
    evidence: { why: ["x"] },
  });

  const res = await request(app).get("/api/recommendations").set("Cookie", cookie).query({ page: 1, limit: 10 });
  expect(res.status).toBe(200);
  const items = res.body?.data?.items || [];
  expect(items.some((r) => String(r._id) === String(dismissed._id))).toBe(true);

  const refreshed = await Recommendation.findById(dismissed._id).lean();
  expect(refreshed.status).toBe("saved");
  expect(refreshed.dismissedUntil).toBeFalsy();
});

test("Generator applies ruleId cooldown (recently saved + dismissed suppressed)", async () => {
  const from = new Date("2026-03-01T00:00:00.000Z");
  const to = new Date("2026-03-07T23:59:59.000Z");

  // Habit signals that would normally generate car_reduce and electricity_reduce
  await Habit.create({
    userId,
    type: "car_km",
    value: 120,
    emissionKg: 30,
    date: new Date("2026-03-03T10:00:00.000Z"),
  });
  await Habit.create({
    userId,
    type: "electricity_kwh",
    value: 80,
    emissionKg: 20,
    date: new Date("2026-03-04T10:00:00.000Z"),
  });

  // Recently saved car_reduce => should be suppressed
  await Recommendation.create({
    userId,
    ruleId: "car_reduce",
    title: "Prev car tip",
    body: "...",
    impact: "High",
    saved: true,
    evidence: { why: ["x"] },
  });

  // Dismissed electricity_reduce until future => should be suppressed
  await Recommendation.create({
    userId,
    ruleId: "electricity_reduce",
    title: "Prev electricity tip",
    body: "...",
    impact: "Medium",
    saved: true,
    status: "dismissed",
    dismissedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    evidence: { why: ["x"] },
  });

  const res = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", cookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);
  const tips = res.body?.data?.tips || [];
  expect(tips.some((t) => t.ruleId === "car_reduce")).toBe(false);
  expect(tips.some((t) => t.ruleId === "electricity_reduce")).toBe(false);
});

test("With an active goal, generator prioritizes biggest contributor first", async () => {
  const freshCookie = await registerAndLogin(app, { email: "prio_user@example.com" });
  const freshUser = await User.findOne({ email: "prio_user@example.com" }).lean();
  const freshUserId = freshUser?._id;

  const from = new Date("2026-04-01T00:00:00.000Z");
  const to = new Date("2026-04-07T23:59:59.000Z");

  await Goal.create({
    userId: freshUserId,
    title: "Weekly cap",
    maxKg: 50,
    startDate: from,
    endDate: to,
    status: "active",
    period: "weekly",
  });

  // Create 2 contributors above thresholds with different emissionKg totals.
  await Habit.create({
    userId: freshUserId,
    type: "car_km",
    value: 120,
    emissionKg: 10,
    date: new Date("2026-04-02T10:00:00.000Z"),
  });
  await Habit.create({
    userId: freshUserId,
    type: "electricity_kwh",
    value: 80,
    emissionKg: 40,
    date: new Date("2026-04-03T10:00:00.000Z"),
  });

  const res = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", freshCookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);
  const tips = res.body?.data?.tips || [];

  // Both rules should be present and electricity should be first (higher emissionKg).
  const idxCar = tips.findIndex((t) => t.ruleId === "car_reduce");
  const idxElec = tips.findIndex((t) => t.ruleId === "electricity_reduce");
  expect(idxCar).toBeGreaterThanOrEqual(0);
  expect(idxElec).toBeGreaterThanOrEqual(0);
  expect(idxElec).toBeLessThan(idxCar);
});

test("PATCH /api/auth/me stores preferences and GET /api/auth/me returns them", async () => {
  const prefCookie = await registerAndLogin(app, { email: "prefs_user@example.com" });

  const patch = await request(app)
    .patch("/api/auth/me")
    .set("Cookie", prefCookie)
    .send({
      preferences: {
        diet: "vegetarian",
        recommendations: { excludedRuleIds: ["car_reduce", "weather_walk"] },
      },
    });

  expect(patch.status).toBe(200);
  expect(patch.body?.data?.preferences?.diet).toBe("vegetarian");
  expect(Array.isArray(patch.body?.data?.preferences?.recommendations?.excludedRuleIds)).toBe(true);

  const me = await request(app).get("/api/auth/me").set("Cookie", prefCookie);
  expect(me.status).toBe(200);
  expect(me.body?.data?.preferences?.diet).toBe("vegetarian");
  expect(me.body?.data?.preferences?.recommendations?.excludedRuleIds).toEqual(["car_reduce", "weather_walk"]);
});

test("Generator respects preferences: vegetarian users do not get meat_reduce tip", async () => {
  const vegCookie = await registerAndLogin(app, { email: "veg_user@example.com" });
  const vegUser = await User.findOne({ email: "veg_user@example.com" }).lean();
  const vegUserId = vegUser?._id;

  const from = new Date("2026-05-01T00:00:00.000Z");
  const to = new Date("2026-05-07T23:59:59.000Z");

  await request(app)
    .patch("/api/auth/me")
    .set("Cookie", vegCookie)
    .send({ preferences: { diet: "vegetarian" } });

  // Signal that would normally generate meat_reduce.
  await Habit.create({
    userId: vegUserId,
    type: "meat_meals",
    value: 10,
    emissionKg: 25,
    date: new Date("2026-05-03T10:00:00.000Z"),
  });

  const res = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", vegCookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);
  const tips = res.body?.data?.tips || [];
  expect(tips.some((t) => t.ruleId === "meat_reduce")).toBe(false);
});

test("Generator respects preferences: excludedRuleIds suppresses specific ruleIds", async () => {
  const exclCookie = await registerAndLogin(app, { email: "exclude_user@example.com" });
  const exclUser = await User.findOne({ email: "exclude_user@example.com" }).lean();
  const exclUserId = exclUser?._id;

  const from = new Date("2026-05-10T00:00:00.000Z");
  const to = new Date("2026-05-16T23:59:59.000Z");

  await request(app)
    .patch("/api/auth/me")
    .set("Cookie", exclCookie)
    .send({ preferences: { recommendations: { excludedRuleIds: ["car_reduce"] } } });

  await Habit.create({
    userId: exclUserId,
    type: "car_km",
    value: 200,
    emissionKg: 50,
    date: new Date("2026-05-12T10:00:00.000Z"),
  });

  const res = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", exclCookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);
  const tips = res.body?.data?.tips || [];
  expect(tips.some((t) => t.ruleId === "car_reduce")).toBe(false);
});
