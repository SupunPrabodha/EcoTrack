import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

function requireJwtSecret() {
	if (!env.JWT_SECRET) throw new ApiError(500, "JWT_SECRET is not configured");
}

export async function register({ name, email, password }) {
	const existing = await User.findOne({ email: email.toLowerCase() });
	if (existing) throw new ApiError(409, "Email already registered");

	const passwordHash = await bcrypt.hash(password, 10);
	const user = await User.create({ name, email, passwordHash });
	return user;
}

export async function login({ email, password }) {
	requireJwtSecret();

	const user = await User.findOne({ email: email.toLowerCase() });
	if (!user) throw new ApiError(401, "Invalid credentials");

	const ok = await user.comparePassword(password);
	if (!ok) throw new ApiError(401, "Invalid credentials");

	const token = jwt.sign(
		{ userId: user._id.toString(), role: user.role, email: user.email },
		env.JWT_SECRET,
		{ expiresIn: env.JWT_EXPIRES_IN }
	);

	return { user, token };
}
