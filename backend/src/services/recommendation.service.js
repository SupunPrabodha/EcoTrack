import mongoose from "mongoose";
import { Habit } from "../models/Habit.js";
import {
  getAirPollution,
  getGridCarbonIntensity,
  getWeather,
  getWeatherByCoords,
  sendGoalAlertEmail,
} from "./thirdparty.service.js";
import { Recommendation } from "../models/Recommendation.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizePagination, pagesFromTotal } from "../utils/pagination.js";
import { Goal } from "../models/Goal.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { EMISSION_FACTORS } from "../utils/constants.js";

function pushAudit(rec, action, meta) {
  const entry = { at: new Date(), action, meta };
  const existing = Array.isArray(rec.audit) ? rec.audit : [];
  const next = [...existing, entry];
  rec.audit = next.length > 30 ? next.slice(next.length - 30) : next;
}

function rangeDays(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return 0;
  const ms = Math.max(0, to.getTime() - from.getTime());
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function buildDataUsed({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence, range }) {
  const types = [];
  if (habitsEvidence?.car_km?.totalValue) types.push("car_km");
  if (habitsEvidence?.public_transport_km?.totalValue) types.push("public_transport_km");
  if (habitsEvidence?.electricity_kwh?.totalValue) types.push("electricity_kwh");
  if (habitsEvidence?.meat_meals?.totalValue) types.push("meat_meals");
  if (habitsEvidence?.plastic_items?.totalValue) types.push("plastic_items");

  const sources = [];
  if (types.length) sources.push("habits");
  if (weather) sources.push("weather");
  if (airPollution) sources.push("air_pollution");
  if (typeof gridIntensity === "number") sources.push("grid_intensity");
  if (goalEvidence) sources.push("goals");

  return {
    sources,
    habitTypes: types,
    rangeDays: range ? rangeDays(range.from, range.to) : 0,
  };
}

function computeConfidence({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence }) {
  const typesCount =
    (habitsEvidence?.car_km?.totalValue ? 1 : 0) +
    (habitsEvidence?.public_transport_km?.totalValue ? 1 : 0) +
    (habitsEvidence?.electricity_kwh?.totalValue ? 1 : 0) +
    (habitsEvidence?.meat_meals?.totalValue ? 1 : 0) +
    (habitsEvidence?.plastic_items?.totalValue ? 1 : 0);

  const sourcesCount =
    typesCount +
    (weather ? 1 : 0) +
    (airPollution ? 1 : 0) +
    (typeof gridIntensity === "number" ? 1 : 0) +
    (goalEvidence ? 1 : 0);

  const habitVolume =
    (habitsEvidence?.car_km?.totalValue || 0) +
    (habitsEvidence?.public_transport_km?.totalValue || 0) +
    (habitsEvidence?.electricity_kwh?.totalValue || 0) +
    (habitsEvidence?.meat_meals?.totalValue || 0) +
    (habitsEvidence?.plastic_items?.totalValue || 0);

  if (sourcesCount >= 3) return "high";
  if (sourcesCount >= 2) return habitVolume >= 40 ? "high" : "medium";
  if (sourcesCount === 1 && habitVolume >= 80) return "medium";
  return "low";
}

async function getRuleFeedbackScores({ userId, ruleIds }) {
  const unique = Array.from(new Set((ruleIds || []).filter(Boolean)));
  if (unique.length === 0) return new Map();

  const rows = await Recommendation.aggregate([
    { $match: { userId: toObjectIdIfPossible(userId), saved: true, ruleId: { $in: unique } } },
    {
      $group: {
        _id: "$ruleId",
        useful: { $sum: { $cond: [{ $eq: ["$rating", "useful"] }, 1, 0] } },
        notUseful: { $sum: { $cond: [{ $eq: ["$rating", "not_useful"] }, 1, 0] } },
      },
    },
  ]);

  const m = new Map();
  for (const r of rows || []) {
    const score = (Number(r.useful) || 0) - (Number(r.notUseful) || 0);
    m.set(String(r._id), score);
  }
  return m;
}

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

function dayMs(n = 1) {
  return Number(n) * 24 * 60 * 60 * 1000;
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

async function maybeAutoExcludeRuleId({ userId, ruleId }) {
  const threshold = Math.max(0, Number(env.RECOMMENDATION_AUTO_EXCLUDE_NOT_USEFUL_COUNT) || 0);
  if (!ruleId || threshold <= 0) return { excluded: false, reason: "disabled_or_missing_rule" };

  const lookbackDays = Math.max(1, Number(env.RECOMMENDATION_AUTO_EXCLUDE_LOOKBACK_DAYS) || 365);
  const cutoff = new Date(Date.now() - dayMs(lookbackDays));

  const notUsefulCount = await Recommendation.countDocuments({
    userId: toObjectIdIfPossible(userId),
    saved: true,
    ruleId,
    rating: "not_useful",
    createdAt: { $gte: cutoff },
  });

  if (notUsefulCount < threshold) {
    return { excluded: false, threshold, notUsefulCount, lookbackDays };
  }

  await User.updateOne(
    { _id: toObjectIdIfPossible(userId) },
    { $addToSet: { "preferences.recommendations.excludedRuleIds": ruleId } }
  );

  return { excluded: true, threshold, notUsefulCount, lookbackDays };
}

async function refreshObservedImpactForUser({ userId, maxToCompute = 10 }) {
  const windowDays = Math.max(1, Number(env.RECOMMENDATION_OBSERVED_IMPACT_WINDOW_DAYS) || 7);
  const now = new Date();
  const cutoff = new Date(now.getTime() - dayMs(windowDays));

  const rows = await Recommendation.find({
    userId: toObjectIdIfPossible(userId),
    saved: true,
    doneAt: { $exists: true, $ne: null, $lte: cutoff },
    $or: [{ "observedImpact.computedAt": { $exists: false } }, { "observedImpact.computedAt": null }],
  })
    .select("_id doneAt")
    .sort({ doneAt: 1 })
    .limit(Math.min(Math.max(Number(maxToCompute) || 10, 1), 50))
    .lean();

  for (const r of rows || []) {
    const doneAt = r?.doneAt instanceof Date ? r.doneAt : new Date(r.doneAt);
    if (Number.isNaN(doneAt.getTime())) continue;
    const beforeFrom = new Date(doneAt.getTime() - dayMs(windowDays));
    const afterTo = new Date(doneAt.getTime() + dayMs(windowDays));
    if (afterTo > now) continue;

    const [beforeKg, afterKg] = await Promise.all([
      emissionsTotalForRange(userId, beforeFrom, doneAt),
      emissionsTotalForRange(userId, doneAt, afterTo),
    ]);

    const observedImpact = {
      windowDays,
      beforeKg: round2(beforeKg),
      afterKg: round2(afterKg),
      deltaKg: round2(beforeKg - afterKg),
      computedAt: new Date(),
    };

    await Recommendation.updateOne({ _id: r._id, userId: toObjectIdIfPossible(userId) }, { $set: { observedImpact } });
  }
}

export async function buildRecommendations(userId, from, to, options = {}) {
  const range = clampDateRange(from, to);

  const user = await User.findById(toObjectIdIfPossible(userId)).select("preferences").lean();
  const prefs = user?.preferences || {};
  const excludedRuleIds = new Set(
    Array.isArray(prefs?.recommendations?.excludedRuleIds) ? prefs.recommendations.excludedRuleIds : []
  );

  // Derived personalization rules (optional): when set, filter out irrelevant tips.
  if (prefs?.diet === "vegetarian" || prefs?.diet === "vegan") excludedRuleIds.add("meat_reduce");
  if (["walk", "bike", "public", "remote"].includes(prefs?.transportMode)) excludedRuleIds.add("car_reduce");

  const stats = await Habit.aggregate([
    { $match: { userId: toObjectIdIfPossible(userId), date: { $gte: range.from, $lte: range.to } } },
    { $group: { _id: "$type", totalValue: { $sum: "$value" }, totalKg: { $sum: "$emissionKg" } } }
  ]);

  const map = Object.fromEntries(stats.map(s => [s._id, s]));

  const tips = [];

  const habitsEvidence = {
    car_km: map.car_km ? { totalValue: map.car_km.totalValue || 0, totalKg: map.car_km.totalKg || 0 } : undefined,
    public_transport_km: map.public_transport_km
      ? { totalValue: map.public_transport_km.totalValue || 0, totalKg: map.public_transport_km.totalKg || 0 }
      : undefined,
    electricity_kwh: map.electricity_kwh ? { totalValue: map.electricity_kwh.totalValue || 0, totalKg: map.electricity_kwh.totalKg || 0 } : undefined,
    meat_meals: map.meat_meals ? { totalValue: map.meat_meals.totalValue || 0, totalKg: map.meat_meals.totalKg || 0 } : undefined,
    plastic_items: map.plastic_items
      ? { totalValue: map.plastic_items.totalValue || 0, totalKg: map.plastic_items.totalKg || 0 }
      : undefined,
  };

  const lat = typeof options.lat === "number" && Number.isFinite(options.lat) ? options.lat : null;
  const lon = typeof options.lon === "number" && Number.isFinite(options.lon) ? options.lon : null;
  const region = typeof options.region === "string" && options.region.trim() ? options.region.trim() : undefined;

  const shouldUseCoords = lat !== null && lon !== null;
  const [weather, airPollution] = await Promise.all([
    shouldUseCoords ? getWeatherByCoords(lat, lon) : getWeather(),
    shouldUseCoords ? getAirPollution(lat, lon) : Promise.resolve(null),
  ]);

  const needsGridIntensity = (map.electricity_kwh?.totalValue || 0) > 0 || !!region;
  const gridIntensity = needsGridIntensity ? await getGridCarbonIntensity({ region }) : null;

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
    airPollution: airPollution || undefined,
    gridIntensityGPerKwh: typeof gridIntensity === "number" ? gridIntensity : undefined,
    goals: goalEvidence || undefined,
    dataUsed: buildDataUsed({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence, range }),
    range: { from: range.from, to: range.to },
  };

  const confidence = computeConfidence({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence });

  // Cooldown: avoid repeating the same ruleId too frequently for the same user.
  const blockedRuleIds = new Set();
  const cooldownDays = Math.max(0, Number(env.RECOMMENDATION_RULE_COOLDOWN_DAYS) || 0);
  if (cooldownDays > 0) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000);
    const rows = await Recommendation.find({
      userId: toObjectIdIfPossible(userId),
      saved: true,
      ruleId: { $exists: true, $ne: null, $ne: "" },
      $or: [{ createdAt: { $gte: cutoff } }, { dismissedUntil: { $gt: now } }],
    })
      .select("ruleId status rating dismissedUntil")
      .lean();

    for (const r of rows) {
      if (!r?.ruleId) continue;

      // Always respect an active dismissal.
      if (r.status === "dismissed" && r.dismissedUntil && r.dismissedUntil > now) {
        blockedRuleIds.add(r.ruleId);
        continue;
      }

      // If user has rated this rule as useful recently, don't suppress it via cooldown.
      if (r.rating === "useful") continue;

      blockedRuleIds.add(r.ruleId);
    }
  }

  const pushTip = (tip) => {
    if (tip?.ruleId && blockedRuleIds.has(tip.ruleId)) return;
    if (tip?.ruleId && excludedRuleIds.has(tip.ruleId)) return;
    tips.push(tip);
  };

  if ((map.car_km?.totalValue || 0) > 60) {
    const carKm = map.car_km?.totalValue || 0;
    const estKg = Math.max(0, (map.car_km?.totalKg || 0) * 0.1);
    pushTip({
      ruleId: "car_reduce",
      title: "Cut down car travel",
      body: "Your weekly car travel is high. Try public transport or carpooling for at least 2 trips this week.",
      impact: "High",
      estimatedKgSaved: round2(estKg),
      confidence,
      why: [
        `Car travel in range: ${Math.round(carKm)} km (threshold: 60 km)`,
        `Estimated savings if you reduce ~10%: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  // Suggest switching a few short trips to public transport when car usage is high and public transport usage is low.
  if ((map.car_km?.totalValue || 0) > 60 && (map.public_transport_km?.totalValue || 0) < 10) {
    const carKm = map.car_km?.totalValue || 0;
    const shiftKm = Math.max(0, Math.min(20, carKm * 0.1));
    const perKmSavings = Math.max(0, (EMISSION_FACTORS.car_km || 0) - (EMISSION_FACTORS.public_transport_km || 0));
    const estKg = round2(shiftKm * perKmSavings);
    pushTip({
      ruleId: "public_transport_boost",
      title: "Swap a couple of trips to public transport",
      body: "Public transport can cut emissions versus driving. Try replacing 1–2 short car trips this week.",
      impact: "Medium",
      estimatedKgSaved: estKg,
      confidence,
      why: [
        `Car travel in range: ${Math.round(carKm)} km (threshold: 60 km)`,
        `Public transport distance in range: ${Math.round(map.public_transport_km?.totalValue || 0)} km`,
        `Estimated savings if you shift ~${Math.round(shiftKm)} km: ${estKg} kg CO2e`,
      ],
    });
  }

  if ((map.electricity_kwh?.totalValue || 0) > 40) {
    const kwh = map.electricity_kwh?.totalValue || 0;
    const estKgRaw =
      typeof gridIntensity === "number" && gridIntensity > 0
        ? (kwh * 0.1 * gridIntensity) / 1000
        : (map.electricity_kwh?.totalKg || 0) * 0.1;
    const estKg = Math.max(0, round2(estKgRaw));
    pushTip({
      ruleId: "electricity_reduce",
      title: "Reduce electricity usage",
      body: "Consider switching off standby devices and using LED bulbs to reduce kWh usage.",
      impact: "Medium",
      estimatedKgSaved: round2(estKg),
      confidence,
      why: [
        `Electricity usage in range: ${Math.round(kwh)} kWh (threshold: 40 kWh)`,
        typeof gridIntensity === "number" && gridIntensity > 0
          ? `Grid intensity: ${Math.round(gridIntensity)} gCO2/kWh (forecast). Estimated savings at ~10% reduction: ${round2(estKg)} kg CO2e`
          : `Estimated savings if you reduce ~10%: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if ((map.meat_meals?.totalValue || 0) > 6) {
    const meals = map.meat_meals?.totalValue || 0;
    const perMealKg = meals > 0 ? (map.meat_meals?.totalKg || 0) / meals : 0;
    const estKg = Math.max(0, perMealKg * 2); // suggest replacing ~2 meals
    pushTip({
      ruleId: "meat_reduce",
      title: "Try a plant-based day",
      body: "Replacing 1–2 meat meals per week can significantly reduce your footprint.",
      impact: "Medium",
      estimatedKgSaved: round2(estKg),
      confidence,
      why: [
        `Meat meals in range: ${Math.round(meals)} (threshold: 6)`,
        `Estimated savings if you replace ~2 meals: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if ((map.plastic_items?.totalValue || 0) > 30) {
    const items = map.plastic_items?.totalValue || 0;
    const estKg = Math.max(0, (map.plastic_items?.totalKg || 0) * 0.2);
    pushTip({
      ruleId: "plastic_reduce",
      title: "Cut down single-use plastics",
      body: "Try carrying a reusable bottle/bag and avoiding single-use items where possible this week.",
      impact: "Low",
      estimatedKgSaved: round2(estKg),
      confidence,
      why: [
        `Plastic items logged in range: ${Math.round(items)} (threshold: 30)`,
        `Estimated savings if you reduce ~20%: ${round2(estKg)} kg CO2e`,
      ],
    });
  }

  if (goalEvidence) {
    const pct = goalEvidence.maxKg > 0 ? goalEvidence.currentKg / goalEvidence.maxKg : 0;
    if (goalEvidence.exceeded || pct >= 0.8) {
      pushTip({
        ruleId: "goal_progress",
        title: goalEvidence.exceeded ? "Goal at risk: emissions exceeded" : "Stay on track with your goal",
        body: goalEvidence.exceeded
          ? `You have exceeded your goal target for "${goalEvidence.goalTitle}". Focus on the biggest contributors this week.`
          : `You are close to your goal limit for "${goalEvidence.goalTitle}". Small changes this week can help you stay within the target.`,
        impact: goalEvidence.exceeded ? "High" : "Medium",
        estimatedKgSaved: 0,
        confidence,
        why: [
          `Goal: ${goalEvidence.goalTitle}`,
          `Current: ${goalEvidence.currentKg} kg CO2e (max: ${goalEvidence.maxKg} kg CO2e)`,
        ],
      });
    }
  }

  const aqi = airPollution?.aqi;
  const airIsBad = typeof aqi === "number" && aqi >= 4;

  if (weather?.condition && ["Clear", "Clouds"].includes(weather.condition) && !airIsBad) {
    pushTip({
      ruleId: "weather_walk",
      title: "Weather looks good for walking/cycling",
      body: `It's ${weather.tempC}°C in ${weather.city}. Consider walking or cycling for short trips today.`,
      impact: "Low",
      confidence,
      why: [
        `Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`,
        ...(aqi ? [`Air quality index (AQI): ${aqi} (${airPollution?.aqiLabel || "Unknown"})`] : []),
      ],
    });
  }

  if (weather?.condition && ["Rain", "Thunderstorm"].includes(weather.condition)) {
    pushTip({
      ruleId: "weather_rain",
      title: "Rainy weather: plan low-carbon indoors",
      body: "If you skip walking today due to rain, try reducing electricity use indoors (shorter showers, switch off standby devices).",
      impact: "Low",
      confidence,
      why: [`Weather from OpenWeather: ${weather.condition} at ${weather.tempC}°C in ${weather.city}`],
    });
  }

  if (tips.length === 0) {
    pushTip({
      ruleId: "balanced",
      title: "Great job!",
      body: "Your recent activity looks balanced. Keep logging habits to get smarter insights.",
      impact: "Positive",
      confidence,
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

  // Rank tips by biggest contributor (kg) and user feedback.
  if (deduped.length > 1) {
    const maxContributor = Math.max(
      habitsEvidence?.car_km?.totalKg || 0,
      habitsEvidence?.public_transport_km?.totalKg || 0,
      habitsEvidence?.electricity_kwh?.totalKg || 0,
      habitsEvidence?.meat_meals?.totalKg || 0,
      habitsEvidence?.plastic_items?.totalKg || 0
    );

    const contributorKg = {
      car_reduce: habitsEvidence?.car_km?.totalKg || 0,
      public_transport_boost: habitsEvidence?.car_km?.totalKg || 0,
      electricity_reduce: habitsEvidence?.electricity_kwh?.totalKg || 0,
      meat_reduce: habitsEvidence?.meat_meals?.totalKg || 0,
      plastic_reduce: habitsEvidence?.plastic_items?.totalKg || 0,
      goal_progress: goalEvidence ? maxContributor + 0.01 : 0,
    };

    const ruleIds = deduped.map((t) => t.ruleId).filter(Boolean);
    const feedbackScores = await getRuleFeedbackScores({ userId, ruleIds });

    const withRank = deduped.map((t, idx) => ({
      t,
      idx,
      kg: contributorKg[t.ruleId] ?? 0,
      feedback: feedbackScores.get(t.ruleId) ?? 0,
    }));

    withRank.sort((a, b) => (b.kg - a.kg) || (b.feedback - a.feedback) || (a.idx - b.idx));
    for (let i = 0; i < deduped.length; i += 1) deduped[i] = withRank[i].t;
  }

  return { weather: weather || null, tips: deduped, evidence, confidence };
}

export async function saveRecommendation({ userId, ruleId, title, body, impact, context, evidence }) {
  const normalizedEvidence = evidence ? { ...evidence } : {};

  // Ensure we always have a range context when client provided it (frontend does).
  const from = normalizedEvidence?.range?.from ? new Date(normalizedEvidence.range.from) : undefined;
  const to = normalizedEvidence?.range?.to ? new Date(normalizedEvidence.range.to) : undefined;
  if ((!normalizedEvidence.range || !normalizedEvidence.range.from || !normalizedEvidence.range.to) && context?.range?.from && context?.range?.to) {
    normalizedEvidence.range = { from: new Date(context.range.from), to: new Date(context.range.to) };
  } else if (from instanceof Date && !Number.isNaN(from.getTime()) && to instanceof Date && !Number.isNaN(to.getTime())) {
    normalizedEvidence.range = { from, to };
  }

  const goalEvidence = normalizedEvidence?.goals;
  const habitsEvidence = normalizedEvidence?.habits;
  const weather = normalizedEvidence?.weather || context?.weather;
  const airPollution = normalizedEvidence?.airPollution || context?.airPollution;
  const gridIntensity = normalizedEvidence?.gridIntensityGPerKwh || context?.gridIntensityGPerKwh;
  const range = normalizedEvidence?.range?.from && normalizedEvidence?.range?.to ? { from: normalizedEvidence.range.from, to: normalizedEvidence.range.to } : null;

  normalizedEvidence.dataUsed = buildDataUsed({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence, range });

  // Ensure non-empty why
  if (!Array.isArray(normalizedEvidence.why) || normalizedEvidence.why.length === 0) {
    const parts = [];
    if (normalizedEvidence.dataUsed?.habitTypes?.length) parts.push(`habits (${normalizedEvidence.dataUsed.habitTypes.join(", ")})`);
    if (normalizedEvidence.dataUsed?.sources?.includes("weather")) parts.push("weather");
    if (normalizedEvidence.dataUsed?.sources?.includes("goals")) parts.push("goal");
    normalizedEvidence.why = [
      parts.length ? `Based on your ${parts.join(" + ")} in the selected range.` : "Based on your activity in the selected range.",
    ];
  }

  const confidence = computeConfidence({ habitsEvidence, weather, airPollution, gridIntensity, goalEvidence });

  const rec = await Recommendation.create({ userId, ruleId, title, body, impact, context, evidence: normalizedEvidence, confidence, saved: true });
  try {
    pushAudit(rec, "saved", { ruleId: ruleId || undefined, impact: impact || undefined });
    await rec.save();
  } catch {
    // best-effort audit trail
  }
  return rec;
}

export async function updateRecommendationFeedback({ userId, id, feedback }) {
  const rec = await Recommendation.findOne({ _id: id, userId, saved: true });
  if (!rec) throw new ApiError(404, "Recommendation not found");

  const before = {
    status: rec.status,
    rating: rec.rating,
    dismissedUntil: rec.dismissedUntil,
  };

  const doneAction = feedback.status === "done";

  if (feedback.status !== undefined) {
    rec.status = feedback.status;
    if (feedback.status !== "dismissed") rec.dismissedUntil = undefined;
  }

  if (doneAction) {
    rec.doneAt = rec.doneAt || new Date();
  }

  if (feedback.dismissDays !== undefined) {
    const days = Number(feedback.dismissDays);
    if (!Number.isFinite(days) || days < 1 || days > 365) throw new ApiError(400, "dismissDays must be between 1 and 365");
    rec.status = "dismissed";
    rec.dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  if (feedback.rating !== undefined) rec.rating = feedback.rating;
  if (feedback.feedbackNote !== undefined) rec.feedbackNote = feedback.feedbackNote || undefined;

  const after = {
    status: rec.status,
    rating: rec.rating,
    dismissedUntil: rec.dismissedUntil,
  };
  pushAudit(rec, "feedback", { before, after, dismissDays: feedback.dismissDays, note: feedback.feedbackNote ? true : undefined });

  if (doneAction) {
    pushAudit(rec, "done", { at: rec.doneAt });
  }

  await rec.save();

  // Feedback-driven personalization: after repeated "not useful", auto-hide this ruleId for the user.
  if (feedback.rating === "not_useful" && rec.ruleId) {
    const res = await maybeAutoExcludeRuleId({ userId, ruleId: rec.ruleId });
    if (res.excluded) {
      try {
        pushAudit(rec, "auto_exclude", { ruleId: rec.ruleId, threshold: res.threshold, notUsefulCount: res.notUsefulCount });
        await rec.save();
      } catch {
        // best-effort audit trail
      }
    }
  }

  return rec;
}

export async function listRecommendations({ userId, page, limit, search, impact }) {
  const now = new Date();

  // Lazily compute observed impact for completed recommendations.
  await refreshObservedImpactForUser({ userId });

  // Auto-unhide expired dismissals so they re-enter the list cleanly.
  await Recommendation.updateMany(
    { userId: toObjectIdIfPossible(userId), saved: true, status: "dismissed", dismissedUntil: { $lte: now } },
    { $set: { status: "saved" }, $unset: { dismissedUntil: 1 } }
  );

  const filter = { userId: toObjectIdIfPossible(userId), saved: true };
  if (impact) filter.impact = impact;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { body: { $regex: search, $options: "i" } },
    ];
  }


  // Hide currently-dismissed items until their dismissedUntil passes.
  filter.$and = [
    {
      $or: [
        { status: { $ne: "dismissed" } },
        { status: "dismissed", dismissedUntil: { $exists: false } },
        { status: "dismissed", dismissedUntil: null },
        { status: "dismissed", dismissedUntil: { $lte: now } },
      ],
    },
  ];

	const pg = normalizePagination({ page, limit, maxLimit: 100, defaultLimit: 10 });
  const [items, total] = await Promise.all([
    Recommendation.aggregate([
      { $match: filter },
      {
        $addFields: {
          statusRank: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "saved"] }, then: 0 },
                { case: { $eq: ["$status", "done"] }, then: 1 },
                { case: { $eq: ["$status", "dismissed"] }, then: 2 },
              ],
              default: 0,
            },
          },
          ratingRank: {
            $switch: {
              branches: [
                { case: { $eq: ["$rating", "useful"] }, then: 0 },
                { case: { $eq: ["$rating", "not_useful"] }, then: 2 },
              ],
              default: 1,
            },
          },
        },
      },
      { $sort: { statusRank: 1, ratingRank: 1, createdAt: -1 } },
      { $skip: pg.skip },
      { $limit: pg.limit },
      { $project: { statusRank: 0, ratingRank: 0 } },
    ]),
    Recommendation.countDocuments(filter),
  ]);

  return { items, total, page: pg.page, limit: pg.limit, pages: pagesFromTotal(total, pg.limit) };
}

export async function getRecommendation({ userId, id }) {
  const rec = await Recommendation.findOne({ _id: id, userId, saved: true });
  if (!rec) throw new ApiError(404, "Recommendation not found");

  // Lazily compute observed impact for this item if it is eligible.
  const windowDays = Math.max(1, Number(env.RECOMMENDATION_OBSERVED_IMPACT_WINDOW_DAYS) || 7);
  const now = new Date();
  if (rec.doneAt && (!rec.observedImpact?.computedAt || rec.observedImpact.computedAt === null)) {
    const cutoff = new Date(now.getTime() - dayMs(windowDays));
    if (rec.doneAt <= cutoff) {
      const beforeFrom = new Date(rec.doneAt.getTime() - dayMs(windowDays));
      const afterTo = new Date(rec.doneAt.getTime() + dayMs(windowDays));
      if (afterTo <= now) {
        const [beforeKg, afterKg] = await Promise.all([
          emissionsTotalForRange(userId, beforeFrom, rec.doneAt),
          emissionsTotalForRange(userId, rec.doneAt, afterTo),
        ]);
        rec.observedImpact = {
          windowDays,
          beforeKg: round2(beforeKg),
          afterKg: round2(afterKg),
          deltaKg: round2(beforeKg - afterKg),
          computedAt: new Date(),
        };
        await rec.save();
      }
    }
  }

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

export async function sendRecommendationsDigest({ userId, from, to, periodDays = 7, lat, lon, region, maxTips = 3 }) {
  const user = await User.findById(toObjectIdIfPossible(userId)).select("name email").lean();
  if (!user) throw new ApiError(404, "User not found");

  let range;
  if (from && to) {
    range = clampDateRange(from, to);
  } else {
    const days = Math.min(Math.max(Number(periodDays) || 7, 1), 31);
    const end = new Date();
    const start = new Date(end.getTime() - dayMs(days));
    range = { from: start, to: end };
  }

  const data = await buildRecommendations(userId, range.from, range.to, { lat, lon, region });
  const tips = Array.isArray(data?.tips) ? data.tips.slice(0, Math.min(Math.max(Number(maxTips) || 3, 1), 10)) : [];

  const lines = [];
  lines.push(`Hi${user.name ? ` ${user.name}` : ""},`);
  lines.push("");
  lines.push("Here are your EcoTrack recommendations digest tips:");
  lines.push(`Range: ${range.from.toISOString()} → ${range.to.toISOString()}`);
  lines.push("");

  if (tips.length === 0) {
    lines.push("No tips were generated for this range.");
  } else {
    tips.forEach((t, i) => {
      lines.push(`${i + 1}. ${t.title}${t.impact ? ` (${t.impact})` : ""}`);
      lines.push(String(t.body || "").trim());
      if (typeof t.estimatedKgSaved === "number") lines.push(`Estimated savings: ${t.estimatedKgSaved} kg CO2e`);
      if (Array.isArray(t.why) && t.why.length) {
        lines.push("Why:");
        for (const w of t.why.slice(0, 3)) lines.push(`- ${w}`);
      }
      lines.push("");
    });
  }

  lines.push("— EcoTrack");

  const subject = "EcoTrack — Recommendations digest";
  const text = lines.join("\n");

  // Safety: avoid sending real emails during automated tests.
  if (env.NODE_ENV === "test") {
    return { sent: false, provider: "test", reason: "test_mode", tipsCount: tips.length, range };
  }

  const emailResult = await sendGoalAlertEmail({ to: user.email, subject, text });
  return { ...emailResult, tipsCount: tips.length, range };
}
