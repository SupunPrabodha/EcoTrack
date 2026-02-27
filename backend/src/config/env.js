import dotenv from "dotenv";
dotenv.config();

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csv(name) {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: num("PORT", 5000),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "test-jwt-secret" : undefined),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  COOKIE_NAME: process.env.COOKIE_NAME || "accessToken",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "",
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "",

  ALLOW_BOOTSTRAP_ADMIN: process.env.ALLOW_BOOTSTRAP_ADMIN === "true",
  BOOTSTRAP_ADMIN_TOKEN: process.env.BOOTSTRAP_ADMIN_TOKEN || "",

  TRUST_PROXY: process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production",
  CORS_ORIGINS: csv("CORS_ORIGINS"),
  REQUEST_TIMEOUT_MS: num("REQUEST_TIMEOUT_MS", 2500),

  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  OPENWEATHER_CITY: process.env.OPENWEATHER_CITY || "Colombo",

  // Removed Carbon Interface variables
  CLIMATIQ_API_KEY: process.env.CLIMATIQ_API_KEY || "",
  CLIMATIQ_BASE_URL: process.env.CLIMATIQ_BASE_URL || "https://api.climatiq.io/data/v1/estimate",

  CARBON_INTENSITY_BASE_URL:
    process.env.CARBON_INTENSITY_BASE_URL || "https://api.carbonintensity.org.uk",
  CARBON_INTENSITY_REGION: process.env.CARBON_INTENSITY_REGION || "",

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || "",
  SENDGRID_SANDBOX_MODE: process.env.SENDGRID_SANDBOX_MODE === "true",

  // Email provider configuration (no secrets baked into code).
  // Set EMAIL_PROVIDER=brevo or sendgrid explicitly in your .env if you want to force one.
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "", // optional: sendgrid|brevo
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "",
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "EcoTrack",
};
