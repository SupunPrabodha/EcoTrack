import mongoose from "mongoose";
import { Habit } from "../models/Habit.js";
import { getWeather } from "./thirdparty.service.js";
import { Recommendation } from "../models/Recommendation.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";

function toObjectIdIfPossible(id) {
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
}

export async function buildRecommendations(userId, from, to) {
  const stats = await Habit.aggregate([
    { $match: { userId: toObjectIdIfPossible(userId), date: { $gte: from, $lte: to } } },
    { $group: { _id: "$type", totalValue: { $sum: "$value" }, totalKg: { $sum: "$emissionKg" } } }
  ]);

  const map = Object.fromEntries(stats.map(s => [s._id, s]));

  const tips = [];

  const habitsEvidence = {
    car_km: map.car_km ? { totalValue: map.car_km.totalValue || 0, totalKg: map.car_km.totalKg || 0 } : undefined,
    electricity_kwh: map.electricity_kwh ? { totalValue: map.electricity_kwh.totalValue || 0, totalKg: map.electricity_kwh.totalKg || 0 } : undefined,
    meat_meals: map.meat_meals ? { totalValue: map.meat_meals.totalValue || 0, totalKg: map.meat_meals.totalKg || 0 } : undefined,
  };

  const weather = await getWeather();

  const evidence = {
    habits: habitsEvidence,
    weather: weather || undefined,
    range: { from, to },
  };

  if ((map.car_km?.totalValue || 0) > 60) {
    const carKm = map.car_km?.totalValue || 0;
    tips.push({
      title: "Cut down car travel",
      body: "Your weekly car travel is high. Try public transport or carpooling for at least 2 trips this week.",
      impact: "High",
      why: [`Car travel in range: ${Math.round(carKm)} km (threshold: 60 km)`],
    });
  }

  if ((map.electricity_kwh?.totalValue || 0) > 40) {
    const kwh = map.electricity_kwh?.totalValue || 0;
    tips.push({
      title: "Reduce electricity usage",
      body: "Consider switching off standby devices and using LED bulbs to reduce kWh usage.",
      impact: "Medium",
      why: [`Electricity usage in range: ${Math.round(kwh)} kWh (threshold: 40 kWh)`],
    });
  }

  if ((map.meat_meals?.totalValue || 0) > 6) {
    const meals = map.meat_meals?.totalValue || 0;
    tips.push({
      title: "Try a plant-based day",
      body: "Replacing 1–2 meat meals per week can significantly reduce your footprint.",
      impact: "Medium",
      why: [`Meat meals in range: ${Math.round(meals)} (threshold: 6)`],
    });
  }

  if (weather?.condition && ["Clear", "Clouds"].includes(weather.condition)) {
    tips.push({
      title: "Weather looks good for walking/cycling",
      body: `It's ${weather.tempC}°C in ${weather.city}. Consider walking or cycling for short trips today.`,
      impact: "Low",
      why: [`Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`],
    });
  }

  if (weather?.condition && ["Rain", "Thunderstorm"].includes(weather.condition)) {
    tips.push({
      title: "Rainy weather: plan low-carbon indoors",
      body: "If you skip walking today due to rain, try reducing electricity use indoors (shorter showers, switch off standby devices).",
      impact: "Low",
      why: [`Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`],
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: "Great job!",
      body: "Your recent activity looks balanced. Keep logging habits to get smarter insights.",
      impact: "Positive",
      why: ["No major high-impact signals detected in the selected date range."],
    });
  }

  return { weather: weather || null, tips, evidence };
}

export async function saveRecommendation({ userId, title, body, impact, context, evidence }) {
  return Recommendation.create({ userId, title, body, impact, context, evidence, saved: true });
}

export async function listRecommendations({ userId, page, limit, search, impact }) {
  const filter = { userId, saved: true };
  if (impact) filter.impact = impact;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { body: { $regex: search, $options: "i" } },
    ];
  }
	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
  const [items, total] = await Promise.all([
    Recommendation.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Recommendation.countDocuments(filter),
  ]);

  return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function getRecommendation({ userId, id }) {
  const rec = await Recommendation.findOne({ _id: id, userId, saved: true });
  if (!rec) throw new ApiError(404, "Recommendation not found");
  return rec;
}

export async function updateRecommendation({ userId, id, patch }) {
  const rec = await Recommendation.findOne({ _id: id, userId, saved: true });
  if (!rec) throw new ApiError(404, "Recommendation not found");
  if (patch.title !== undefined) rec.title = patch.title;
  if (patch.body !== undefined) rec.body = patch.body;
  if (patch.impact !== undefined) rec.impact = patch.impact;
  await rec.save();
  return rec;
}

export async function deleteRecommendation({ userId, id }) {
  const deleted = await Recommendation.findOneAndDelete({ _id: id, userId, saved: true });
  if (!deleted) throw new ApiError(404, "Recommendation not found");
}
