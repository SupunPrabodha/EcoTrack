import { EMISSION_FACTORS, HABIT_TYPES } from "../utils/constants.js";
import { ApiError } from "../utils/ApiError.js";

export function calculateEmissionKg(type, value) {
	if (!HABIT_TYPES.includes(type)) throw new ApiError(400, "Unknown habit type");
	const v = Number(value);
	if (!Number.isFinite(v) || v < 0) throw new ApiError(400, "Invalid value");

	const factor = EMISSION_FACTORS[type];
	if (typeof factor !== "number") throw new ApiError(500, "Emission factor missing");
	return Number((v * factor).toFixed(6));
}

