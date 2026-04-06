import request from "supertest";
import { registerAndLogin, setupTestApp, teardownTestApp } from "./testUtils.js";
import { User } from "../src/models/User.js";
import { Recommendation } from "../src/models/Recommendation.js";
import { Goal } from "../src/models/Goal.js";
import { EmissionEntry } from "../src/models/EmissionEntry.js";

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
