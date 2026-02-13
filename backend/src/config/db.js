import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
  await mongoose.connect(env.MONGO_URI);
  console.log("✅ MongoDB connected");
}
