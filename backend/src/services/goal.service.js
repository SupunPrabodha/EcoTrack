import { Goal } from "../models/Goal.js";
import { getSummary } from "./emission.service.js";

export async function upsertGoal({ userId, period, targetKg }) {
  // Keep one active goal per period
  await Goal.updateMany({ userId, period }, { $set: { active: false } });
  return Goal.create({ userId, period, targetKg, active: true });
}

export async function getActiveGoal(userId, period) {
  return Goal.findOne({ userId, period, active: true });
}

export async function getGoalProgress(userId, period, from, to) {
  const goal = await getActiveGoal(userId, period);
  const summary = await getSummary(userId, from, to);

  if (!goal) {
    return {
      hasGoal: false,
      totalKg: summary.totalKg,
      targetKg: null,
      progressPct: null,
      status: "no_goal"
    };
  }

  const progressPct = goal.targetKg === 0 ? 0 : Number(((summary.totalKg / goal.targetKg) * 100).toFixed(1));
  const status = summary.totalKg <= goal.targetKg ? "on_track" : "exceeded";

  return {
    hasGoal: true,
    totalKg: summary.totalKg,
    targetKg: goal.targetKg,
    progressPct,
    status
  };
}
