import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const requireAuth = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  const token = req.cookies?.[env.COOKIE_NAME || "accessToken"] || bearer;
  if (!token) return next(new ApiError(401, "Unauthorized"));
  if (!env.JWT_SECRET) return next(new ApiError(500, "JWT_SECRET is not configured"));

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch {
    next(new ApiError(401, "Invalid/Expired token"));
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, "Forbidden"));
  next();
};
