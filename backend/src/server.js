import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

await connectDB();
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ API running on http://localhost:${env.PORT}`);
  console.log(`📘 Swagger: http://localhost:${env.PORT}/api/docs`);
});
