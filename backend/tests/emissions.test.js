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

test("emissions CRUD for manual entries", async () => {
  const create = await request(app)
    .post("/api/emissions")
    .set("Cookie", cookie)
    .send({
      sourceType: "manual",
      habitType: "electricity_kwh",
      value: 5,
      date: new Date().toISOString(),
      notes: "Manual electricity entry",
    });

  expect(create.status).toBe(201);
  expect(create.body.success).toBe(true);
  expect(create.body.data.emissionKg).toBeGreaterThanOrEqual(0);

  const id = create.body.data._id;

  const list = await request(app)
    .get("/api/emissions?page=1&limit=10")
    .set("Cookie", cookie);

  expect(list.status).toBe(200);
  expect(list.body.data.items.length).toBeGreaterThan(0);

  const getOne = await request(app).get(`/api/emissions/${id}`).set("Cookie", cookie);
  expect(getOne.status).toBe(200);
  expect(getOne.body.data._id).toBe(id);

  const update = await request(app)
    .put(`/api/emissions/${id}`)
    .set("Cookie", cookie)
    .send({ notes: "Updated note" });
  expect(update.status).toBe(200);
  expect(update.body.data.notes).toBe("Updated note");

  const del = await request(app).delete(`/api/emissions/${id}`).set("Cookie", cookie);
  expect(del.status).toBe(200);
});

test("habit-derived emission entry is read-only via emissions CRUD", async () => {
  const habit = await request(app)
    .post("/api/habits")
    .set("Cookie", cookie)
    .send({ type: "car_km", value: 10, date: new Date().toISOString() });

  expect(habit.status).toBe(201);

  const listHabitDerived = await request(app)
    .get("/api/emissions?sourceType=habit&page=1&limit=10")
    .set("Cookie", cookie);

  expect(listHabitDerived.status).toBe(200);
  const derived = listHabitDerived.body.data.items.find((i) => i.habitId);
  expect(derived).toBeTruthy();

  const update = await request(app)
    .put(`/api/emissions/${derived._id}`)
    .set("Cookie", cookie)
    .send({ notes: "try edit" });

  expect(update.status).toBe(403);
});
