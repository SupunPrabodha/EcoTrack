import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import request from "supertest";

export async function setupTestApp() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = createApp();
  return { app, mongo };
}

export async function teardownTestApp(mongo) {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
}

export async function registerAndLogin(app, { name = "Test", email = "t@t.com", password = "Password123!" } = {}) {
  await request(app).post("/api/auth/register").send({ name, email, password });
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.headers["set-cookie"];
}
