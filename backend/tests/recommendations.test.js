import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";

let app;
let mongo;
let cookie;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();

  await request(app).post("/api/auth/register").send({
    name: "Rec Tester",
    email: "rec@test.com",
    password: "Password123!",
  });

  const login = await request(app).post("/api/auth/login").send({
    email: "rec@test.com",
    password: "Password123!",
  });
  cookie = login.headers["set-cookie"];
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

test("generate -> save -> list/search -> delete", async () => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);

  // Seed a habit that should trigger at least one deterministic tip
  const habitRes = await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({
      type: "car_km",
      value: 120,
      date: today.toISOString(),
    });
  expect(habitRes.status).toBe(201);

  const gen = await request(app)
    .get("/api/recommendations/generate")
    .set("Cookie", cookie)
    .query({ from: from.toISOString(), to: to.toISOString() });

  expect(gen.status).toBe(200);
  expect(gen.body.success).toBe(true);
  expect(Array.isArray(gen.body.data.tips)).toBe(true);
  expect(gen.body.data.tips.length).toBeGreaterThan(0);

  const matching = gen.body.data.tips.find((t) => t.title === "Cut down car travel");
  expect(matching).toBeTruthy();

  const save = await request(app)
    .post("/api/recommendations")
    .set("Cookie", cookie)
    .send({
      title: matching.title,
      body: matching.body,
      impact: matching.impact,
      context: { range: { from: from.toISOString(), to: to.toISOString() } },
      evidence: { why: matching.why || [] },
    });

  expect(save.status).toBe(201);
  expect(save.body.success).toBe(true);
  expect(save.body.data.title).toBe(matching.title);

  const list = await request(app)
    .get("/api/recommendations")
    .set("Cookie", cookie)
    .query({ page: 1, limit: 10 });
  expect(list.status).toBe(200);
  expect(list.body.success).toBe(true);
  expect(Array.isArray(list.body.data.items)).toBe(true);
  expect(list.body.data.items.length).toBe(1);

  const search = await request(app)
    .get("/api/recommendations")
    .set("Cookie", cookie)
    .query({ page: 1, limit: 10, search: "car travel" });
  expect(search.status).toBe(200);
  expect(search.body.data.items.length).toBe(1);

  const id = list.body.data.items[0]._id;
  const del = await request(app)
    .delete(`/api/recommendations/${id}`)
    .set("Cookie", cookie);
  expect(del.status).toBe(200);

  const listAfter = await request(app)
    .get("/api/recommendations")
    .set("Cookie", cookie)
    .query({ page: 1, limit: 10 });
  expect(listAfter.status).toBe(200);
  expect(listAfter.body.data.items.length).toBe(0);
});
