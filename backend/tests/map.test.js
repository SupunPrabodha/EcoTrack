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

test("map endpoints are protected", async () => {
  const res = await request(app).get("/api/map/data");
  expect(res.status).toBe(401);
});

test("GET /api/map/data returns locations", async () => {
  const res = await request(app).get("/api/map/data").set("Cookie", cookie);
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Array.isArray(res.body.data.locations)).toBe(true);
  expect(res.body.data.locations.length).toBeGreaterThan(0);
});

test("GET /api/map/location validates lat/lon", async () => {
  const res = await request(app).get("/api/map/location").set("Cookie", cookie);
  expect(res.status).toBe(400);
});

test("GET /api/map/location returns data", async () => {
  const res = await request(app)
    .get("/api/map/location?lat=6.9271&lon=79.8612")
    .set("Cookie", cookie);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.lat).toBeCloseTo(6.9271);
  expect(res.body.data.lon).toBeCloseTo(79.8612);
  expect(res.body.data.weather).toBeTruthy();
  expect(res.body.data.airPollution).toBeTruthy();
});

test("GET /api/map/nearby returns nearby locations", async () => {
  const res = await request(app)
    .get("/api/map/nearby?lat=6.9271&lon=79.8612&cnt=5")
    .set("Cookie", cookie);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.center).toBeTruthy();
  expect(Array.isArray(res.body.data.locations)).toBe(true);
  expect(res.body.data.locations.length).toBeGreaterThan(0);
});
