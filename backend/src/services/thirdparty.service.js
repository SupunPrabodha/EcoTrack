import axios from "axios";
import { env } from "../config/env.js";

const TTL_15_MIN = 15 * 60 * 1000;
const TTL_NEGATIVE = 60 * 1000;

const cache = {
  weather: { value: null, expiresAt: 0 },
  gridIntensity: new Map(), // key: regionId string => { value, expiresAt }
  airPollution: new Map(), // key: "lat,lon" => { value, expiresAt }
  nearby: new Map(), // key: "lat,lon,cnt" => { value, expiresAt }
};

function httpClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: env.REQUEST_TIMEOUT_MS,
    headers: {
      "User-Agent": "EcoTrack/1.0",
      Accept: "application/json",
    },
  });
}

function safeJsonError(err) {
  const status = err?.response?.status;
  const message = err?.response?.data?.message || err?.message || "Third-party request failed";
  return { status, message };
}

const openWeather = httpClient("https://api.openweathermap.org");
const carbonInterface = httpClient(env.CARBON_INTERFACE_BASE_URL);
const carbonIntensity = httpClient(env.CARBON_INTENSITY_BASE_URL);

const IS_TEST = env.NODE_ENV === "test";

export async function getWeather(city = env.OPENWEATHER_CITY) {
  if (!env.OPENWEATHER_API_KEY) return null;

	const cacheKey = (city || "").trim().toLowerCase() || "default";
	const now = Date.now();
	if (cache.weather.expiresAt > now && cache.weather.key === cacheKey) {
		return cache.weather.value;
	}

  try {
    const { data } = await openWeather.get("/data/2.5/weather", {
      params: { q: city, appid: env.OPENWEATHER_API_KEY, units: "metric" },
    });

		const mapped = {
      city: data.name,
      tempC: data.main?.temp,
      condition: data.weather?.[0]?.main || "Unknown",
      windMs: data.wind?.speed,
      humidityPct: data.main?.humidity,
    };

		cache.weather = { key: cacheKey, value: mapped, expiresAt: now + TTL_15_MIN };
		return mapped;
  } catch {
		cache.weather = { key: cacheKey, value: null, expiresAt: now + TTL_NEGATIVE };
    return null;
  }
}

// Air Pollution (OpenWeather Air Pollution API)
export async function getAirPollution(lat, lon) {
  if (IS_TEST) {
    return {
      aqi: 2,
      aqiLabel: "Fair",
      co: 210.1,
      no2: 12.3,
      o3: 30.2,
      pm2_5: 8.4,
      pm10: 14.7,
      so2: 3.1,
    };
  }
  if (!env.OPENWEATHER_API_KEY || !lat || !lon) return null;

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();
  const cached = cache.airPollution.get(cacheKey);
  if (cached?.expiresAt > now) return cached.value;

  try {
    const { data } = await openWeather.get("/data/2.5/air_pollution", {
      params: { lat, lon, appid: env.OPENWEATHER_API_KEY },
    });

    const aqi = data.list?.[0]?.main?.aqi; // 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    const components = data.list?.[0]?.components || {};
    
    const mapped = {
      aqi,
      aqiLabel: ["Good", "Fair", "Moderate", "Poor", "Very Poor"][aqi - 1] || "Unknown",
      co: components.co,        // Carbon monoxide (μg/m³)
      no2: components.no2,      // Nitrogen dioxide (μg/m³)
      o3: components.o3,        // Ozone (μg/m³)
      pm2_5: components.pm2_5,  // Fine particles matter (μg/m³)
      pm10: components.pm10,    // Coarse particulate matter (μg/m³)
      so2: components.so2,      // Sulphur dioxide (μg/m³)
    };

    cache.airPollution.set(cacheKey, { value: mapped, expiresAt: now + TTL_15_MIN });
    return mapped;
  } catch {
    cache.airPollution.set(cacheKey, { value: null, expiresAt: now + TTL_NEGATIVE });
    return null;
  }
}

// Weather by coordinates
export async function getWeatherByCoords(lat, lon) {
  if (IS_TEST) {
    return {
      city: "Test City",
      tempC: 27.5,
      condition: "Clear",
      description: "clear sky",
      windMs: 3.2,
      humidityPct: 60,
      lat,
      lon,
    };
  }
  if (!env.OPENWEATHER_API_KEY || !lat || !lon) return null;

  try {
    const { data } = await openWeather.get("/data/2.5/weather", {
      params: { lat, lon, appid: env.OPENWEATHER_API_KEY, units: "metric" },
    });

    return {
      city: data.name,
      tempC: data.main?.temp,
      condition: data.weather?.[0]?.main || "Unknown",
      description: data.weather?.[0]?.description || "",
      windMs: data.wind?.speed,
      humidityPct: data.main?.humidity,
      lat: data.coord?.lat,
      lon: data.coord?.lon,
    };
  } catch {
    return null;
  }
}

// Nearby places (OpenWeather "find" endpoint) + basic weather.
export async function getNearbyPlacesWeather(lat, lon, { cnt = 12 } = {}) {
  if (IS_TEST) {
    const safeCnt = Math.max(1, Math.min(30, Number(cnt) || 12));
    return Array.from({ length: Math.min(3, safeCnt) }).map((_, i) => {
      const d = 0.01 * (i + 1);
      return {
        name: `Nearby ${i + 1}`,
        lat: lat + d,
        lon: lon + d,
        weather: {
          city: `Nearby ${i + 1}`,
          tempC: 26 + i,
          condition: "Clouds",
          description: "scattered clouds",
          windMs: 2 + i,
          humidityPct: 55,
          lat: lat + d,
          lon: lon + d,
        },
      };
    });
  }
  if (!env.OPENWEATHER_API_KEY || !lat || !lon) return [];

  const safeCnt = Math.max(1, Math.min(30, Number(cnt) || 12));
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${safeCnt}`;
  const now = Date.now();
  const cached = cache.nearby.get(cacheKey);
  if (cached?.expiresAt > now) return cached.value;

  try {
    const { data } = await openWeather.get("/data/2.5/find", {
      params: {
        lat,
        lon,
        cnt: safeCnt,
        appid: env.OPENWEATHER_API_KEY,
        units: "metric",
      },
    });

    const list = Array.isArray(data?.list) ? data.list : [];
    const mapped = list
      .map((item) => {
        const ilat = item?.coord?.lat;
        const ilon = item?.coord?.lon;
        if (typeof ilat !== "number" || typeof ilon !== "number") return null;
        return {
          name: item?.name || "Unknown",
          lat: ilat,
          lon: ilon,
          weather: {
            city: item?.name,
            tempC: item?.main?.temp,
            condition: item?.weather?.[0]?.main || "Unknown",
            description: item?.weather?.[0]?.description || "",
            windMs: item?.wind?.speed,
            humidityPct: item?.main?.humidity,
            lat: ilat,
            lon: ilon,
          },
        };
      })
      .filter(Boolean);

    cache.nearby.set(cacheKey, { value: mapped, expiresAt: now + TTL_15_MIN });
    return mapped;
  } catch {
    cache.nearby.set(cacheKey, { value: [], expiresAt: now + TTL_NEGATIVE });
    return [];
  }
}

// Carbon Intensity (default: UK National Grid). Returns gCO2/kWh.
export async function getGridCarbonIntensity({ region } = {}) {
  if (IS_TEST) return 123;
	const regionId = (region || env.CARBON_INTENSITY_REGION || "").trim();
	const cacheKey = regionId || "__national__";
	const now = Date.now();
	const cached = cache.gridIntensity.get(cacheKey);
	if (cached?.expiresAt > now) return cached.value;

  try {
    if (regionId) {
      const { data } = await carbonIntensity.get(`/regional/regionid/${encodeURIComponent(regionId)}`);
      const intensity = data?.data?.[0]?.data?.[0]?.intensity?.forecast;
		const val = typeof intensity === "number" ? intensity : null;
		cache.gridIntensity.set(cacheKey, { value: val, expiresAt: now + (val === null ? TTL_NEGATIVE : TTL_15_MIN) });
		return val;
    }

    const { data } = await carbonIntensity.get("/intensity");
    const intensity = data?.data?.[0]?.intensity?.forecast;
		const val = typeof intensity === "number" ? intensity : null;
		cache.gridIntensity.set(cacheKey, { value: val, expiresAt: now + (val === null ? TTL_NEGATIVE : TTL_15_MIN) });
		return val;
  } catch {
		cache.gridIntensity.set(cacheKey, { value: null, expiresAt: now + TTL_NEGATIVE });
    return null;
  }
}

// Carbon Interface estimates (best-effort): returns kgCO2e for supported habit types.
// If the API key is missing or request fails, return null and let caller fallback.
export async function estimateCarbonInterfaceKg({ habitType, value, date }) {
  if (!env.CARBON_INTERFACE_API_KEY) return null;

  try {
    // Map EcoTrack habit types to Carbon Interface estimate payloads.
    // Note: Carbon Interface has strict schemas; this is a pragmatic subset.
    let payload = null;

    if (habitType === "electricity_kwh") {
      payload = {
        type: "electricity",
        electricity_unit: "kwh",
        electricity_value: value,
        country: env.CARBON_INTERFACE_ELECTRICITY_COUNTRY,
      };
    }

    if (habitType === "car_km" && env.CARBON_INTERFACE_VEHICLE_MODEL_ID) {
      payload = {
        type: "vehicle",
        distance_unit: "km",
        distance_value: value,
        vehicle_model_id: env.CARBON_INTERFACE_VEHICLE_MODEL_ID,
      };
    }

    // For types we don't support via Carbon Interface, caller falls back.
    if (!payload) return null;

    const { data } = await carbonInterface.post(
      "/estimates",
      { ...payload, ...(date ? { measurement_time: date.toISOString?.() } : {}) },
      {
        headers: {
          Authorization: `Bearer ${env.CARBON_INTERFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const kg = data?.data?.attributes?.carbon_kg;
    return typeof kg === "number" ? kg : null;
  } catch {
    return null;
  }
}

export async function sendGoalAlertEmail({ to, subject, text }) {
  const requested = (env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const provider = requested || (env.BREVO_API_KEY ? "brevo" : env.SENDGRID_API_KEY ? "sendgrid" : "");

  if (!provider) return { sent: false, reason: "email_not_configured" };

  if (provider === "brevo") {
    if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) return { sent: false, reason: "brevo_not_configured" };
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME || "EcoTrack" },
          to: [{ email: to }],
          subject,
          textContent: text,
        },
        {
          timeout: env.REQUEST_TIMEOUT_MS,
          headers: {
            "api-key": env.BREVO_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      return { sent: true, provider: "brevo" };
    } catch (err) {
      return { sent: false, reason: "brevo_failed", provider: "brevo", error: safeJsonError(err) };
    }
  }

  if (provider === "sendgrid") {
    if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) return { sent: false, reason: "sendgrid_not_configured" };

    try {
      await axios.post(
        "https://api.sendgrid.com/v3/mail/send",
        {
          from: { email: env.SENDGRID_FROM_EMAIL },
          personalizations: [{ to: [{ email: to }] }],
          subject,
          content: [{ type: "text/plain", value: text }],
          mail_settings: env.SENDGRID_SANDBOX_MODE ? { sandbox_mode: { enable: true } } : undefined,
        },
        {
          timeout: env.REQUEST_TIMEOUT_MS,
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return { sent: true, provider: "sendgrid" };
    } catch (err) {
      return { sent: false, reason: "sendgrid_failed", provider: "sendgrid", error: safeJsonError(err) };
    }
  }

  return { sent: false, reason: "unsupported_email_provider" };
}
