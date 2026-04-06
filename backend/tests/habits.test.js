import request from "supertest";
import { registerAndLogin, setupTestApp, teardownTestApp } from "./testUtils.js";
import { Habit } from "../src/models/Habit.js";
import { EmissionEntry } from "../src/models/EmissionEntry.js";

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

afterEach(async () => {
  await Promise.all([Habit.deleteMany({}), EmissionEntry.deleteMany({})]);
});

test("create habit", async () => {
  const res = await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({
      type: "car_km",
      value: 10,
      date: new Date().toISOString()
    });

  expect(res.status).toBe(201);
  expect(res.body.data.emissionKg).toBeGreaterThan(0);
});

test("summarize habits groups by type", async () => {
  const d1 = new Date();
  d1.setDate(d1.getDate() - 2);
  const d2 = new Date();
  d2.setDate(d2.getDate() - 1);

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 5, date: d1.toISOString() });

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 7, date: d2.toISOString() });

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "electricity_kwh", value: 3, date: d2.toISOString() });

  const from = new Date(d1);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const res = await request(app)
    .get("/api/habits/summary")
    .set("Cookie", cookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(res.status).toBe(200);
  const items = res.body?.data?.items || [];
  const car = items.find((x) => x.type === "car_km");
  const elec = items.find((x) => x.type === "electricity_kwh");
  expect(car).toBeTruthy();
  expect(elec).toBeTruthy();
  expect(car.entries).toBe(2);
  expect(car.totalEmissionKg).toBeGreaterThan(0);
  expect(elec.entries).toBe(1);
});
