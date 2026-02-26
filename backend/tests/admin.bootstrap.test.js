import request from "supertest";
import { setupTestApp, teardownTestApp } from "./testUtils.js";

let app;
let mongo;

beforeAll(async () => {
  // Enable bootstrap for this test run only
  process.env.ALLOW_BOOTSTRAP_ADMIN = "true";
  process.env.BOOTSTRAP_ADMIN_TOKEN = "bootstrap-test-token";

  const setup = await setupTestApp();
  mongo = setup.mongo;
  app = setup.app;
});

afterAll(async () => {
  await teardownTestApp(mongo);
  delete process.env.ALLOW_BOOTSTRAP_ADMIN;
  delete process.env.BOOTSTRAP_ADMIN_TOKEN;
});

test("bootstrap admin promotes the first admin user", async () => {
  // 1) Register a normal user
  const reg = await request(app).post("/api/auth/register").send({
    name: "Admin Candidate",
    email: "admin@example.com",
    password: "Password123!",
  });
  expect(reg.status).toBe(201);

  // 2) Bootstrap to admin
  const boot = await request(app).post("/api/admin/bootstrap").send({
    email: "admin@example.com",
    token: "bootstrap-test-token",
  });
  expect(boot.status).toBe(200);
  expect(boot.body?.success).toBe(true);
  expect(boot.body?.data?.role).toBe("admin");

  // 3) Bootstrapping again should be rejected
  const boot2 = await request(app).post("/api/admin/bootstrap").send({
    email: "admin@example.com",
    token: "bootstrap-test-token",
  });
  expect(boot2.status).toBe(409);
});

test("bootstrap admin rejects invalid token", async () => {
  const res = await request(app).post("/api/admin/bootstrap").send({
    email: "someone@example.com",
    token: "wrong-token",
  });
  expect(res.status).toBe(403);
});
