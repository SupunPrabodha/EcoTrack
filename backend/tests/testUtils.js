import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort cleanup
  }
}

export async function setupTestApp() {
  const downloadDir = process.env.MONGOMS_DOWNLOAD_DIR
    ? path.resolve(process.cwd(), process.env.MONGOMS_DOWNLOAD_DIR)
    : path.resolve(process.cwd(), ".cache/mongodb-binaries");

  fs.mkdirSync(downloadDir, { recursive: true });

  const version = process.env.MONGOMS_VERSION;
  if (version) {
    // If a previous run crashed mid-download, a stale lock can block new instances.
    safeUnlink(path.join(downloadDir, `${version}.lock`));
  }

  const mongo = await MongoMemoryServer.create({
    binary: {
      version: version || undefined,
      downloadDir,
    },
  });
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
