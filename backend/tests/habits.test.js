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
