import { Router } from "express";
import { sendSuccess } from "../utils/response.js";
import { env } from "../config/env.js";
const router = Router();

router.get("/", (req, res) => sendSuccess(res, { data: { ok: true, name: "EcoTrack API" } }));

router.get("/integrations", (req, res) => {
	const provider = (env.EMAIL_PROVIDER || "").trim().toLowerCase();
	const resolvedProvider = provider || (env.BREVO_API_KEY ? "brevo" : env.SENDGRID_API_KEY ? "sendgrid" : "");

	sendSuccess(res, {
		data: {
			openWeather: { enabled: Boolean(env.OPENWEATHER_API_KEY) },
			carbonInterface: { enabled: Boolean(env.CARBON_INTERFACE_API_KEY) },
			carbonIntensity: { enabled: Boolean(env.CARBON_INTENSITY_BASE_URL) },
			email: {
				provider: resolvedProvider || null,
				enabled:
					resolvedProvider === "brevo"
						? Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL)
						: resolvedProvider === "sendgrid"
							? Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL)
							: false,
			},
		},
	});
});
export default router;
