import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";

let app;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
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
