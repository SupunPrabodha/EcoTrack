import { Goal } from "../models/Goal.js";
import { getEmissionSummary, getEmissionTrends } from "./emission.service.js";
import { buildRecommendations } from "./recommendation.service.js";
import { ApiError } from "../utils/ApiError.js";

function parseMonth(month) {
  if (typeof month !== "string") throw new ApiError(400, "month is required");
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new ApiError(400, "month must be in YYYY-MM format");
  const year = Number(m[1]);
  const monthIndex = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    throw new ApiError(400, "Invalid month");
  }
  return { year, monthIndex };
}

function monthRangeUtc({ year, monthIndex }) {
  const from = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
  return { from, to };
}

function previousMonth({ year, monthIndex }) {
  if (monthIndex === 1) return { year: year - 1, monthIndex: 12 };
  return { year, monthIndex: monthIndex - 1 };
}

function pctChange(current, previous) {
  if (!previous) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function topContributor(byType) {
  const rows = Array.isArray(byType) ? byType : [];
  const cleaned = rows
    .filter((r) => r && r._id)
    .map((r) => ({ type: r._id, kg: Number(r.totalKg ?? 0), count: Number(r.count ?? 0) }))
    .sort((a, b) => b.kg - a.kg);
  return cleaned[0] || null;
}

function contributorRecommendation(type) {
  if (type === "car_km") {
    return {
      title: "Reduce car travel next month",
      body: "Try combining errands into one trip, carpooling, or using public transport for 1–2 trips per week.",
      impact: "High",
    };
  }
  if (type === "electricity_kwh") {
    return {
      title: "Lower electricity usage",
      body: "Switch off standby devices, reduce AC usage where possible, and use LED bulbs to cut kWh consumption.",
      impact: "Medium",
    };
  }
  if (type === "meat_meals") {
    return {
      title: "Add more plant-based meals",
      body: "Replacing 1–2 meat meals per week can meaningfully reduce your footprint.",
      impact: "Medium",
    };
  }
  if (type === "public_transport_km") {
    return {
      title: "Keep using public transport",
      body: "Public transport usually emits less per km than driving alone. Keep it up and consider walking short distances.",
      impact: "Low",
    };
  }
  if (type === "plastic_items") {
    return {
      title: "Cut down single-use plastics",
      body: "Try a reusable bottle/bag and buy items with less packaging to reduce plastic waste.",
      impact: "Low",
    };
  }
  return {
    title: "Review high-emission activities",
    body: "Check which activities contributed most and try one small change next month.",
    impact: "Medium",
  };
}

export async function getMonthlyReport({ userId, month }) {
  const ym = parseMonth(month);
  const range = monthRangeUtc(ym);

  const [summary, trends] = await Promise.all([
    getEmissionSummary({ userId, from: range.from, to: range.to }),
    getEmissionTrends({ userId, from: range.from, to: range.to }),
  ]);

  const goal = await Goal.findOne({
    userId,
    period: "monthly",
    startDate: { $lte: range.to },
    endDate: { $gte: range.from },
  }).sort({ createdAt: -1 });

  const prevYm = previousMonth(ym);
  const prevRange = monthRangeUtc(prevYm);
  const prevSummary = await getEmissionSummary({ userId, from: prevRange.from, to: prevRange.to });

  const totalKg = Number(summary?.totalKg ?? 0);
  const prevTotalKg = Number(prevSummary?.totalKg ?? 0);
  const deltaKg = totalKg - prevTotalKg;

  let level = "low";
  const reasons = [];

  if (goal) {
    const exceeded = totalKg > Number(goal.maxKg ?? 0);
    level = exceeded ? "high" : "low";
    reasons.push(exceeded ? `Exceeded monthly goal (${goal.maxKg} kg)` : `Within monthly goal (${goal.maxKg} kg)`);
  } else if (prevTotalKg > 0) {
    level = totalKg > prevTotalKg ? "high" : "low";
    reasons.push(level === "high" ? "Higher than previous month" : "Lower than or equal to previous month");
  } else {
    // Fallback when no previous data exists.
    level = totalKg > 100 ? "high" : "low";
    reasons.push(level === "high" ? "High total emissions for the month" : "Low total emissions for the month");
  }

  let feedback = null;
  let recommendations = [];

  if (level === "high") {
    const rec = await buildRecommendations(userId, range.from, range.to);
    const top = topContributor(summary?.byType);
    recommendations = [
      ...(rec?.tips || []).map((t) => ({ title: t.title, body: t.body, impact: t.impact, why: t.why })),
      ...(top?.type ? [{ ...contributorRecommendation(top.type), why: [`Top contributor: ${top.type} (${top.kg.toFixed(2)} kg)`] }] : []),
    ];
    feedback = "Your emissions were high this month. Try one or two changes next month to bring it down.";
  } else {
    const goalMsg = goal ? `You stayed within your monthly goal (${Number(goal.maxKg).toFixed(2)} kg).` : null;
    const compareMsg = prevTotalKg > 0 ? (deltaKg < 0 ? `You reduced emissions by ${Math.abs(deltaKg).toFixed(2)} kg vs last month.` : "") : null;
    feedback = ["Great job!", goalMsg, compareMsg, "Keep logging habits to stay consistent."]
      .filter(Boolean)
      .join(" ");
  }

  return {
    month,
    range: { from: range.from, to: range.to },
    summary,
    trends,
    level,
    feedback,
    reasons,
    comparison: {
      previousMonth: `${prevYm.year}-${String(prevYm.monthIndex).padStart(2, "0")}`,
      previousTotalKg: prevTotalKg,
      deltaKg,
      deltaPct: pctChange(totalKg, prevTotalKg),
    },
    goal: goal
      ? {
          id: goal._id,
          title: goal.title,
          maxKg: goal.maxKg,
          status: goal.status,
          startDate: goal.startDate,
          endDate: goal.endDate,
        }
      : null,
    recommendations,
  };
}
