import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export async function register({ name, email, password }) {
	const normalizedEmail = String(email).toLowerCase().trim();
	const existing = await User.findOne({ email: normalizedEmail });
	if (existing) throw new ApiError(409, "Email already in use");

	const passwordHash = await bcrypt.hash(String(password), 10);
	const user = await User.create({
		name: String(name).trim(),
		email: normalizedEmail,
		passwordHash,
	});
	return user;
}

export async function login({ email, password }) {
	const normalizedEmail = String(email).toLowerCase().trim();
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) throw new ApiError(401, "Invalid email or password");

	const ok = await user.comparePassword(String(password));
	if (!ok) throw new ApiError(401, "Invalid email or password");

	if (!env.JWT_SECRET) throw new ApiError(500, "JWT secret not configured");
	const token = jwt.sign({ userId: user._id.toString(), role: user.role }, env.JWT_SECRET, {
		expiresIn: env.JWT_EXPIRES_IN,
	});

	return { user, token };
}

