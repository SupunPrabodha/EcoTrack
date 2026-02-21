import request from "supertest";
import { setupTestApp, teardownTestApp, registerAndLogin } from "./testUtils.js";

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

test("create goal then evaluate progress", async () => {
  const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const create = await request(app)
    .post("/api/goals")
    .set("Cookie", cookie)
    .send({
      title: "Keep weekly emissions low",
      maxKg: 5,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      alertsEnabled: true,
    });

  expect(create.status).toBe(201);
  const goalId = create.body.data._id;

  // Add emissions to exceed goal
  await request(app)
    .post("/api/emissions")
    .set("Cookie", cookie)
    .send({
      sourceType: "manual",
      emissionKg: 10,
      date: new Date().toISOString(),
      notes: "High emission event",
    });

  const evalRes = await request(app)
    .post(`/api/goals/${goalId}/evaluate`)
    .set("Cookie", cookie);

  expect(evalRes.status).toBe(200);
  expect(evalRes.body.data.progress.exceeded).toBe(true);
  // SendGrid likely not configured in tests; still should not fail.
  expect(evalRes.body.data.alert).toBeTruthy();
});
