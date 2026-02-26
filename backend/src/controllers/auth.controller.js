import { asyncHandler } from "../utils/asyncHandler.js";
import { register, login } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

function expiresInToMs(expiresIn) {
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) return expiresIn * 1000;
  const raw = String(expiresIn || "").trim();
  if (!raw) return 7 * 24 * 60 * 60 * 1000;
  const m = raw.match(/^([0-9]+)([smhd])$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

function cookieOptions() {
  const derivedSameSite = env.COOKIE_SECURE ? "none" : "lax";
  const sameSite = (env.COOKIE_SAMESITE || derivedSameSite);

  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export const registerController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const user = await register({ name, email, password });
  sendCreated(res, { data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const { user, token } = await login({ email, password });

  res.cookie(env.COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: expiresInToMs(env.JWT_EXPIRES_IN),
  });

  sendSuccess(res, { data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const logoutController = asyncHandler(async (req, res) => {
  res.clearCookie(env.COOKIE_NAME, {
    ...cookieOptions(),
  });
  sendSuccess(res, { message: "Logged out" });
});

export const meController = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user });
});
