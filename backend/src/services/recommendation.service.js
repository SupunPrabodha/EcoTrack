import { Habit } from "../models/Habit.js";
import { getWeather } from "./thirdparty.service.js";

export async function buildRecommendations(userId, from, to) {
  const stats = await Habit.aggregate([
    { $match: { userId, date: { $gte: from, $lte: to } } },
    { $group: { _id: "$type", totalValue: { $sum: "$value" }, totalKg: { $sum: "$emissionKg" } } }
  ]);

  const map = Object.fromEntries(stats.map(s => [s._id, s]));

  const tips = [];

  if ((map.car_km?.totalValue || 0) > 60) {
    tips.push({
      title: "Cut down car travel",
      body: "Your weekly car travel is high. Try public transport or carpooling for at least 2 trips this week.",
      impact: "High"
    });
  }

  if ((map.electricity_kwh?.totalValue || 0) > 40) {
    tips.push({
      title: "Reduce electricity usage",
      body: "Consider switching off standby devices and using LED bulbs to reduce kWh usage.",
      impact: "Medium"
    });
  }

  if ((map.meat_meals?.totalValue || 0) > 6) {
    tips.push({
      title: "Try a plant-based day",
      body: "Replacing 1–2 meat meals per week can significantly reduce your footprint.",
      impact: "Medium"
    });
  }

  const weather = await getWeather();
  if (weather?.condition && ["Clear", "Clouds"].includes(weather.condition)) {
    tips.push({
      title: "Weather looks good for walking/cycling",
      body: `It's ${weather.tempC}°C in ${weather.city}. Consider walking or cycling for short trips today.`,
      impact: "Low"
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: "Great job!",
      body: "Your recent activity looks balanced. Keep logging habits to get smarter insights.",
      impact: "Positive"
    });
  }

  return { weather, tips };
}
