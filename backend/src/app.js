import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { apiLimiter } from "./middlewares/rateLimit.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import { swaggerSpec } from "./docs/swagger.js";

import authRoutes from "./routes/auth.routes.js";
import habitsRoutes from "./routes/habits.routes.js";
import emissionsRoutes from "./routes/emissions.routes.js";
import goalsRoutes from "./routes/goals.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(apiLimiter);

  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.get("/", (req, res) => res.send("EcoTrack API is running"));
  app.use("/api/health", healthRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/habits", habitsRoutes);
  app.use("/api/emissions", emissionsRoutes);
  app.use("/api/goals", goalsRoutes);
  app.use("/api/recommendations", recommendationsRoutes);

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
