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

test("list habits with date range and type filter", async () => {
  const d1 = new Date();
  d1.setDate(d1.getDate() - 2);
  const d2 = new Date();
  d2.setDate(d2.getDate() - 1);
  const d3 = new Date();

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 5, date: d1.toISOString() });

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "electricity_kwh", value: 3, date: d2.toISOString() });

  await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 2, date: d3.toISOString() });

  const from = new Date(d1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(d3);
  to.setHours(23, 59, 59, 999);

  const resAll = await request(app)
    .get("/api/habits")
    .set("Cookie", cookie)
    .query({ page: 1, limit: 10, from: from.toISOString(), to: to.toISOString() });

  expect(resAll.status).toBe(200);
  expect(Array.isArray(resAll.body?.data?.items)).toBe(true);
  expect(resAll.body.data.items.length).toBe(3);
  expect(resAll.body.meta.total).toBe(3);

  const resCar = await request(app)
    .get("/api/habits")
    .set("Cookie", cookie)
    .query({ page: 1, limit: 10, from: from.toISOString(), to: to.toISOString(), type: "car_km" });

  expect(resCar.status).toBe(200);
  expect(resCar.body.data.items.length).toBe(2);
  expect(resCar.body.data.items.every((h) => h.type === "car_km")).toBe(true);
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

test("update habit recomputes emission and syncs emission entry", async () => {
  const created = await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 10, date: new Date().toISOString() });

  expect(created.status).toBe(201);
  const id = created.body.data._id;
  const before = created.body.data.emissionKg;

  const updated = await request(app)
    .patch(`/api/habits/${id}`)
    .set("Cookie", cookie)
    .send({ value: 20 });

  expect(updated.status).toBe(200);
  expect(updated.body.data.value).toBe(20);
  expect(updated.body.data.emissionKg).toBeGreaterThan(before);

  const entry = await EmissionEntry.findOne({ habitId: id });
  expect(entry).toBeTruthy();
  expect(entry.value).toBe(20);
  expect(entry.emissionKg).toBeGreaterThan(before);
});

test("delete habit removes linked emission entry", async () => {
  const created = await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "plastic_items", value: 4, date: new Date().toISOString() });

  const id = created.body.data._id;
  const entryBefore = await EmissionEntry.findOne({ habitId: id });
  expect(entryBefore).toBeTruthy();

  const res = await request(app).delete(`/api/habits/${id}`).set("Cookie", cookie);
  expect(res.status).toBe(200);

  const habitAfter = await Habit.findById(id);
  const entryAfter = await EmissionEntry.findOne({ habitId: id });
  expect(habitAfter).toBeNull();
  expect(entryAfter).toBeNull();
});
