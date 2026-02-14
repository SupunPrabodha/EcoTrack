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
    name: "Test",
    email: "t@t.com",
    password: "Password123!"
  });

  const login = await request(app).post("/api/auth/login").send({
    email: "t@t.com",
    password: "Password123!"
  });

  cookie = login.headers["set-cookie"];
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
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
