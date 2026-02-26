import request from "supertest";
import { setupTestApp, teardownTestApp } from "./testUtils.js";

let app;
let mongo;

beforeAll(async () => {
  const setup = await setupTestApp();
  mongo = setup.mongo;
  app = setup.app;
});

afterAll(async () => {
  await teardownTestApp(mongo);
});

test("register then login", async () => {
  const reg = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "Password123!"
  });
  expect(reg.status).toBe(201);

  const login = await request(app).post("/api/auth/login").send({
    email: "test@example.com",
    password: "Password123!"
  });
  expect(login.status).toBe(200);
});
