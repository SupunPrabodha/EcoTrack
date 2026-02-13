import { asyncHandler } from "../utils/asyncHandler.js";
import { register, login } from "../services/auth.service.js";
import { env } from "../config/env.js";

export const registerController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const user = await register({ name, email, password });
  res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const { user, token } = await login({ email, password });

  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const logoutController = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.json({ success: true, message: "Logged out" });
});

export const meController = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});
