import axios from "axios";
import { env } from "../config/env.js";

export async function getWeather(city = env.OPENWEATHER_CITY) {
  if (!env.OPENWEATHER_API_KEY) return null;

  const url = "https://api.openweathermap.org/data/2.5/weather";
  const { data } = await axios.get(url, {
    params: { q: city, appid: env.OPENWEATHER_API_KEY, units: "metric" }
  });

  return {
    city: data.name,
    tempC: data.main.temp,
    condition: data.weather?.[0]?.main || "Unknown"
  };
}
