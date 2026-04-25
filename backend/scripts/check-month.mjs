import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { EmissionEntry } from "../src/models/EmissionEntry.js";
import { Habit } from "../src/models/Habit.js";

function tzOffsetMinutesToString(tzOffsetMinutes) {
  const total = Number(tzOffsetMinutes);
  if (!Number.isFinite(total)) throw new Error("Invalid tzOffsetMinutes");
  if (total < -840 || total > 840) throw new Error("Invalid tzOffsetMinutes range");
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function monthRangeWithOffset({ year, monthIndex, tzOffsetMinutes }) {
  const offsetMs = Number(tzOffsetMinutes) * 60 * 1000;
  const startUtcMs = Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0) - offsetMs;
  const endUtcMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) - offsetMs - 1;
  return { from: new Date(startUtcMs), to: new Date(endUtcMs) };
}

async function main() {
  const email = process.argv[2] || "madeesha@gmail.com";
  const year = Number(process.argv[3] || 2026);
  const monthIndex = Number(process.argv[4] || 4);
  const tzOffsetMinutes = Number(process.argv[5] || 330); // UTC+05:30

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing (check backend/.env)");
    process.exit(1);
  }

  const tz = tzOffsetMinutesToString(tzOffsetMinutes);
  const { from, to } = monthRangeWithOffset({ year, monthIndex, tzOffsetMinutes });

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email }).select("_id email").lean();
  if (!user) {
    console.log("No user found for email", email);
    await mongoose.disconnect();
    return;
  }

  const match = { userId: user._id, date: { $gte: from, $lte: to } };

  const habitMatch = { userId: user._id, date: { $gte: from, $lte: to } };

  const [count, totals, minDoc, maxDoc, buckets, habitCount, habitTotals, habitMin, habitMax] = await Promise.all([
    EmissionEntry.countDocuments(match),
    EmissionEntry.aggregate([{ $match: match }, { $group: { _id: null, totalKg: { $sum: "$emissionKg" } } }]),
    EmissionEntry.findOne(match).sort({ date: 1 }).select("date emissionKg habitType sourceType").lean(),
    EmissionEntry.findOne(match).sort({ date: -1 }).select("date emissionKg habitType sourceType").lean(),
    EmissionEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: tz,
            },
          },
          totalKg: { $sum: "$emissionKg" },
          entries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Habit.countDocuments(habitMatch),
    Habit.aggregate([{ $match: habitMatch }, { $group: { _id: null, totalKg: { $sum: "$emissionKg" } } }]),
    Habit.findOne(habitMatch).sort({ date: 1 }).select("date emissionKg type").lean(),
    Habit.findOne(habitMatch).sort({ date: -1 }).select("date emissionKg type").lean(),
  ]);

  console.log(JSON.stringify({
    email,
    userId: String(user._id),
    month: `${year}-${String(monthIndex).padStart(2, "0")}`,
    tzOffsetMinutes,
    rangeUtc: { from: from.toISOString(), to: to.toISOString() },
    entriesInRange: count,
    totalKg: Number(totals?.[0]?.totalKg ?? 0),
    firstEntry: minDoc ? { date: minDoc.date?.toISOString?.() ?? minDoc.date, kg: minDoc.emissionKg, type: minDoc.habitType, source: minDoc.sourceType } : null,
    lastEntry: maxDoc ? { date: maxDoc.date?.toISOString?.() ?? maxDoc.date, kg: maxDoc.emissionKg, type: maxDoc.habitType, source: maxDoc.sourceType } : null,
    dailyBucketCount: buckets.length,
    sampleDailyBuckets: buckets.slice(0, 5),

    habitsInRange: habitCount,
    habitsTotalKg: Number(habitTotals?.[0]?.totalKg ?? 0),
    firstHabit: habitMin ? { date: habitMin.date?.toISOString?.() ?? habitMin.date, kg: habitMin.emissionKg, type: habitMin.type } : null,
    lastHabit: habitMax ? { date: habitMax.date?.toISOString?.() ?? habitMax.date, kg: habitMax.emissionKg, type: habitMax.type } : null,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
