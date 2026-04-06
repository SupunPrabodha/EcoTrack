import mongoose from "mongoose";
import { Habit } from "../models/Habit.js";
import { getWeather } from "./thirdparty.service.js";
import { Recommendation } from "../models/Recommendation.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";
import { Goal } from "../models/Goal.js";
import { EmissionEntry } from "../models/EmissionEntry.js";

function toObjectIdIfPossible(id) {
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
}

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clampDateRange(from, to) {
  const start = from instanceof Date ? from : new Date(from);
  const end = to instanceof Date ? to : new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date range");
  }
  if (end < start) throw new ApiError(400, "Invalid date range: to must be after from");
  return { from: start, to: end };
}

async function getActiveGoalForRange(userId, from, to) {
  return Goal.findOne({
    userId: toObjectIdIfPossible(userId),
    status: "active",
    $and: [{ startDate: { $lt: to } }, { endDate: { $gt: from } }],
  }).sort({ startDate: -1 });
}

async function emissionsTotalForRange(userId, from, to) {
  const totals = await EmissionEntry.aggregate([
    { $match: { userId: toObjectIdIfPossible(userId), date: { $gte: from, $lte: to } } },
    { $group: { _id: null, totalKg: { $sum: "$emissionKg" } } },
  ]);
  return totals?.[0]?.totalKg || 0;
}

export async function buildRecommendations(userId, from, to) {
  const range = clampDateRange(from, to);

  const stats = await Habit.aggregate([
    { $match: { userId: toObjectIdIfPossible(userId), date: { $gte: range.from, $lte: range.to } } },
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

  const goal = await getActiveGoalForRange(userId, range.from, range.to);
  let goalEvidence;
  if (goal) {
    const overlapFrom = goal.startDate > range.from ? goal.startDate : range.from;
    const overlapTo = goal.endDate < range.to ? goal.endDate : range.to;
    const currentKg = await emissionsTotalForRange(userId, overlapFrom, overlapTo);
    goalEvidence = {
      activeGoalId: goal._id,
      goalTitle: goal.title,
      currentKg: round2(currentKg),
      maxKg: round2(goal.maxKg),
      exceeded: currentKg > goal.maxKg,
    };
  }

  const evidence = {
    habits: habitsEvidence,
    weather: weather || undefined,
    goals: goalEvidence || undefined,
    range: { from: range.from, to: range.to },
  };

  if ((map.car_km?.totalValue || 0) > 60) {
    const carKm = map.car_km?.totalValue || 0;
    const estKg = Math.max(0, (map.car_km?.totalKg || 0) * 0.1);
    tips.push({
      ruleId: "car_reduce",
      title: "Cut down car travel",
      body: "Your weekly car travel is high. Try public transport or carpooling for at least 2 trips this week.",
      impact: "High",
      estimatedKgSaved: round2(estKg),
      why: [
        `Car travel in range: ${Math.round(carKm)} km (threshold: 60 km)`,
        `Estimated savings if you reduce ~10%: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if ((map.electricity_kwh?.totalValue || 0) > 40) {
    const kwh = map.electricity_kwh?.totalValue || 0;
    const estKg = Math.max(0, (map.electricity_kwh?.totalKg || 0) * 0.1);
    tips.push({
      ruleId: "electricity_reduce",
      title: "Reduce electricity usage",
      body: "Consider switching off standby devices and using LED bulbs to reduce kWh usage.",
      impact: "Medium",
      estimatedKgSaved: round2(estKg),
      why: [
        `Electricity usage in range: ${Math.round(kwh)} kWh (threshold: 40 kWh)`,
        `Estimated savings if you reduce ~10%: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if ((map.meat_meals?.totalValue || 0) > 6) {
    const meals = map.meat_meals?.totalValue || 0;
    const perMealKg = meals > 0 ? (map.meat_meals?.totalKg || 0) / meals : 0;
    const estKg = Math.max(0, perMealKg * 2); // suggest replacing ~2 meals
    tips.push({
      ruleId: "meat_reduce",
      title: "Try a plant-based day",
      body: "Replacing 1–2 meat meals per week can significantly reduce your footprint.",
      impact: "Medium",
      estimatedKgSaved: round2(estKg),
      why: [
        `Meat meals in range: ${Math.round(meals)} (threshold: 6)`,
        `Estimated savings if you replace ~2 meals: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if (goalEvidence) {
    const pct = goalEvidence.maxKg > 0 ? goalEvidence.currentKg / goalEvidence.maxKg : 0;
    if (goalEvidence.exceeded || pct >= 0.8) {
      tips.push({
        ruleId: "goal_progress",
        title: goalEvidence.exceeded ? "Goal at risk: emissions exceeded" : "Stay on track with your goal",
        body: goalEvidence.exceeded
          ? `You have exceeded your goal target for "${goalEvidence.goalTitle}". Focus on the biggest contributors this week.`
          : `You are close to your goal limit for "${goalEvidence.goalTitle}". Small changes this week can help you stay within the target.`,
        impact: goalEvidence.exceeded ? "High" : "Medium",
        estimatedKgSaved: 0,
        why: [
          `Goal: ${goalEvidence.goalTitle}`,
          `Current: ${goalEvidence.currentKg} kg CO2e (max: ${goalEvidence.maxKg} kg CO2e)`,
        ],
      });
    }
  }

  if (weather?.condition && ["Clear", "Clouds"].includes(weather.condition)) {
    tips.push({
      ruleId: "weather_walk",
      title: "Weather looks good for walking/cycling",
      body: `It's ${weather.tempC}°C in ${weather.city}. Consider walking or cycling for short trips today.`,
      impact: "Low",
      why: [`Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`],
    });
  }

  if (weather?.condition && ["Rain", "Thunderstorm"].includes(weather.condition)) {
    tips.push({
      ruleId: "weather_rain",
      title: "Rainy weather: plan low-carbon indoors",
      body: "If you skip walking today due to rain, try reducing electricity use indoors (shorter showers, switch off standby devices).",
      impact: "Low",
      why: [`Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`],
    });
  }

  if (tips.length === 0) {
    tips.push({
      ruleId: "balanced",
      title: "Great job!",
      body: "Your recent activity looks balanced. Keep logging habits to get smarter insights.",
      impact: "Positive",
      why: ["No major high-impact signals detected in the selected date range."],
    });
  }

  // Deduplicate by ruleId/title to avoid repeated suggestions
  const seen = new Set();
  const deduped = [];
  for (const tip of tips) {
    const key = tip.ruleId || tip.title;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tip);
  }

  return { weather: weather || null, tips: deduped, evidence };
}

export async function saveRecommendation({ userId, ruleId, title, body, impact, context, evidence }) {
  return Recommendation.create({ userId, ruleId, title, body, impact, context, evidence, saved: true });
}

export async function updateRecommendationFeedback({ userId, id, feedback }) {
  const rec = await Recommendation.findOne({ _id: id, userId, saved: true });
  if (!rec) throw new ApiError(404, "Recommendation not found");

  if (feedback.status !== undefined) {
    rec.status = feedback.status;
    if (feedback.status !== "dismissed") rec.dismissedUntil = undefined;
  }

  if (feedback.dismissDays !== undefined) {
    const days = Number(feedback.dismissDays);
    if (!Number.isFinite(days) || days < 1 || days > 365) throw new ApiError(400, "dismissDays must be between 1 and 365");
    rec.status = "dismissed";
    rec.dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  if (feedback.rating !== undefined) rec.rating = feedback.rating;
  if (feedback.feedbackNote !== undefined) rec.feedbackNote = feedback.feedbackNote || undefined;

  await rec.save();
  return rec;
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
