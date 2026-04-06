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

function normalizeExcludedRuleIds(value) {
	if (!Array.isArray(value)) return undefined;
	const next = [];
	const seen = new Set();
	for (const raw of value) {
		if (typeof raw !== "string") continue;
		const s = raw.trim();
		if (!s || s.length > 80) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		next.push(s);
		if (next.length >= 30) break;
	}
	return next;
}

export async function getMe({ userId }) {
	const user = await User.findById(userId).select("name email role preferences").lean();
	if (!user) throw new ApiError(404, "User not found");
	return {
		id: user._id,
		userId: user._id,
		name: user.name,
		email: user.email,
		role: user.role,
		preferences: user.preferences || {},
	};
}

export async function updateMe({ userId, patch }) {
	const user = await User.findById(userId);
	if (!user) throw new ApiError(404, "User not found");

	const prefs = user.preferences || {};
	const incoming = patch?.preferences || {};

	if (Object.prototype.hasOwnProperty.call(incoming, "diet")) {
		prefs.diet = incoming.diet ?? undefined;
	}

	if (Object.prototype.hasOwnProperty.call(incoming, "transportMode")) {
		prefs.transportMode = incoming.transportMode ?? undefined;
	}

	if (incoming.recommendations && Object.prototype.hasOwnProperty.call(incoming.recommendations, "excludedRuleIds")) {
		const normalized = normalizeExcludedRuleIds(incoming.recommendations.excludedRuleIds);
		prefs.recommendations = prefs.recommendations || {};
		prefs.recommendations.excludedRuleIds = normalized;
	}

	user.preferences = prefs;
	await user.save();

	return {
		id: user._id,
		userId: user._id,
		name: user.name,
		email: user.email,
		role: user.role,
		preferences: user.preferences || {},
	};
}
