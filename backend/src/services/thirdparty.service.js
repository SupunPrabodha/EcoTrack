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

// export async function getWeather(city = env.OPENWEATHER_CITY) {
//   if (!env.OPENWEATHER_API_KEY) return null;

//   const url = "https://api.openweathermap.org/data/2.5/weather";
//   const { data } = await axios.get(url, {
//     params: { q: city, appid: env.OPENWEATHER_API_KEY, units: "metric" }
//   });

//   return {
//     city: data.name,
//     tempC: data.main.temp,
//     condition: data.weather?.[0]?.main || "Unknown"
//   };
// }

// Carbon Intensity (default: UK National Grid). Returns gCO2/kWh.
export async function getGridCarbonIntensity({ region } = {}) {
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