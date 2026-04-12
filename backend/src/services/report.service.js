import { Goal } from "../models/Goal.js";
import { Habit } from "../models/Habit.js";
import { EmissionEntry } from "../models/EmissionEntry.js";
import { getEmissionSummary, getEmissionTrends } from "./emission.service.js";
import { buildRecommendations } from "./recommendation.service.js";
import { ApiError } from "../utils/ApiError.js";
import { Recommendation } from "../models/Recommendation.js";
import { User } from "../models/User.js";
import { BRAND, drawBrandHeader, drawKpiRow, drawKeyValue, drawSectionTitle, fmtDate, fmtDateTime, pct, renderPdf } from "../utils/pdf.js";
import { getGlobalRecommendationAnalytics } from "./admin.service.js";

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

function monthRangeLocal({ year, monthIndex }) {
  const from = new Date(year, monthIndex - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex, 0, 23, 59, 59, 999);
  return { from, to };
}

function localTzOffsetString(d = new Date()) {
  // JS getTimezoneOffset() returns minutes behind UTC.
  // Convert to offset string accepted by MongoDB, e.g. "+05:30".
  const total = -d.getTimezoneOffset();
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function tzOffsetMinutesToString(tzOffsetMinutes) {
  if (tzOffsetMinutes == null) return null;
  const total = Number(tzOffsetMinutes);
  if (!Number.isFinite(total)) throw new ApiError(400, "Invalid tzOffset");
  if (total < -840 || total > 840) throw new ApiError(400, "Invalid tzOffset");
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function monthRangeWithOffset({ year, monthIndex, tzOffsetMinutes }) {
  // tzOffsetMinutes is minutes ahead of UTC. Example: UTC+05:30 => 330.
  // We compute UTC instants that correspond to local month boundaries.
  const offsetMs = Number(tzOffsetMinutes) * 60 * 1000;
  const startUtcMs = Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0) - offsetMs;
  const endUtcMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) - offsetMs - 1;
  return { from: new Date(startUtcMs), to: new Date(endUtcMs) };
}

function monthRangeLabel({ year, monthIndex }) {
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const mm = String(monthIndex).padStart(2, "0");
  return `${year}-${mm}-01 → ${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
}

async function backfillEmissionEntriesFromHabits({ userId, from, to }) {
  // Older data (or older backend builds) may have Habit logs without mirrored EmissionEntry rows.
  // Monthly reports are computed from EmissionEntry, so we upsert missing rows from Habits.
  const habits = await Habit.find({ userId, date: { $gte: from, $lte: to } })
    .select("_id userId type value emissionKg calculationMethod date")
    .lean();

  if (!habits.length) return { habits: 0, upserts: 0 };

  const ops = habits.map((h) => ({
    updateOne: {
      filter: { userId: h.userId, habitId: h._id },
      update: {
        $set: {
          userId: h.userId,
          habitId: h._id,
          sourceType: "habit",
          habitType: h.type,
          value: h.value,
          emissionKg: h.emissionKg,
          calculationMethod: h.calculationMethod,
          date: h.date,
        },
      },
      upsert: true,
    },
  }));

  const res = await EmissionEntry.bulkWrite(ops, { ordered: false });
  return { habits: habits.length, upserts: Number(res?.upsertedCount ?? 0) };
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

export async function getMonthlyReport({ userId, month, tzOffsetMinutes } = {}) {
  const ym = parseMonth(month);
  const tzFromClient = tzOffsetMinutesToString(tzOffsetMinutes);
  const range = tzFromClient ? monthRangeWithOffset({ ...ym, tzOffsetMinutes }) : monthRangeLocal(ym);
  const tz = tzFromClient || localTzOffsetString();

  // Ensure report source data exists for habit logs.
  await backfillEmissionEntriesFromHabits({ userId, from: range.from, to: range.to });

  const [summary, trends] = await Promise.all([
    getEmissionSummary({ userId, from: range.from, to: range.to }),
    getEmissionTrends({ userId, from: range.from, to: range.to, timezone: tz }),
  ]);

  const goal = await Goal.findOne({
    userId,
    period: "monthly",
    startDate: { $lte: range.to },
    endDate: { $gte: range.from },
  }).sort({ createdAt: -1 });

  const prevYm = previousMonth(ym);
  const prevRange = monthRangeLocal(prevYm);
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
    rangeLabel: monthRangeLabel(ym),
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

function levelBg(level) {
  const x = String(level || "").toLowerCase();
  if (x === "high") return "#ef4444";
  if (x === "low") return BRAND.emerald;
  return BRAND.cyan;
}

export async function generateMonthlyEmissionsReportPdf({ userId, month, tzOffsetMinutes } = {}) {
  const report = await getMonthlyReport({ userId, month, tzOffsetMinutes });
  const user = await User.findById(userId).select("name email").lean();
  if (!user) throw new ApiError(404, "User not found");

  const totalKg = safeNum(report?.summary?.totalKg ?? 0, 2);
  const entries = Number(report?.summary?.count ?? 0);
  const deltaKg = safeNum(report?.comparison?.deltaKg ?? 0, 2);
  const prevTotalKg = safeNum(report?.comparison?.previousTotalKg ?? 0, 2);
  const deltaPct =
    typeof report?.comparison?.deltaPct === "number" && Number.isFinite(report.comparison.deltaPct)
      ? `${safeNum(report.comparison.deltaPct, 1)}%`
      : "—";

  const goalMaxKg = report?.goal?.maxKg != null ? safeNum(report.goal.maxKg, 2) : null;
  const goalText = goalMaxKg != null ? `${goalMaxKg} kg` : "—";

  const daily = Array.isArray(report?.trends) ? report.trends : [];

  return renderPdf((doc) => {
    drawBrandHeader(doc, {
      title: "EcoTrack — Monthly Emissions Report",
      subtitle: `Generated ${fmtDateTime(new Date())} • ${report.month} • ${report.rangeLabel || ""}`.trim(),
    });

    // Keep the same *content* structure as the old Habits-page PDF,
    // but render it using the shared pdf.js template (same style as recommendations PDF).
    sectionTitle(doc, "Report context");
    keyValue(doc, "User", `${user.name} <${user.email}>`);
    keyValue(doc, "Month", report.month);
    keyValue(doc, "Total emissions", `${totalKg} kg CO2e`);
    keyValue(doc, "Generated", fmtDateTime(new Date()));

    // Keep extra fields minimal (old PDF didn't show them), but retain goal at-a-glance.
    if (report.goal?.title) {
      keyValue(doc, "Monthly goal", `${goalText} (${report.goal.title})`);
    }

    const startX = doc.page.margins.left;
    const y0 = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("Level", startX, y0);
    drawBadge(doc, { text: report.level, x: startX + 110, y: y0 - 2, bg: levelBg(report.level) });
    doc.moveDown(0.8);

    sectionTitle(doc, "Daily breakdown");
    if (!daily.length) {
      doc.font("Helvetica").fontSize(9).fillColor(BRAND.muted).text("No daily trend data for this month.");
    } else {
      let y = doc.y;
      const cols = {
        day: startX,
        kg: startX + 160,
        entries: startX + 260,
      };
      const headers = [
        { key: "day", label: "Day", width: 150 },
        { key: "kg", label: "Total kg", width: 90 },
        { key: "entries", label: "Entries", width: 90 },
      ];
      y = drawTableHeader(doc, { y, cols, headers });
      doc.fillColor(BRAND.text).font("Helvetica").fontSize(9);

      let zebra = false;
      for (const row of daily.slice(0, 31)) {
        if (y > 760) {
          doc.addPage();
          y = doc.y;
          y = drawTableHeader(doc, { y, cols, headers });
          zebra = false;
        }

        zebra = !zebra;
        drawZebraRow(doc, { y, zebraOn: zebra });
        doc.text(String(row?._id ?? "—"), cols.day, y, { width: 150 });
        doc.text(String(safeNum(row?.totalKg ?? 0, 2)), cols.kg, y, { width: 90 });
        doc.text(String(Number(row?.entries ?? 0)), cols.entries, y, { width: 90 });
        y += 16;
      }
    }
  });
}

function ensureDate(value, name) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Invalid ${name}`);
  return d;
}

function safeNum(n, digits = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  const m = 10 ** digits;
  return Math.round(x * m) / m;
}

function sectionTitle(doc, text) {
  drawSectionTitle(doc, text);
}

function keyValue(doc, k, v) {
  drawKeyValue(doc, k, v);
}

function drawTableHeader(doc, { y, cols, headers }) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const h = 18;

  doc.save();
  doc.rect(left, y - 2, right - left, h).fill(BRAND.slate);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  for (const hcol of headers) {
    doc.text(hcol.label, cols[hcol.key], y, { width: hcol.width, ellipsis: true });
  }
  doc.restore();

  return y + h;
}

function drawZebraRow(doc, { y, zebraOn }) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const h = 16;
  if (zebraOn) {
    doc.save();
    doc.rect(left, y - 1, right - left, h).fill(BRAND.zebra);
    doc.restore();
  }
  return y;
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function rateColor(rate) {
  const r = clamp01(rate);
  if (r === null) return BRAND.muted;
  if (r >= 0.6) return BRAND.emerald;
  if (r >= 0.3) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

function drawBadge(doc, { text, x, y, bg, fg = "#ffffff" }) {
  const t = String(text ?? "—");
  const padX = 6;
  const h = 12;

  doc.save();
  doc.font("Helvetica-Bold").fontSize(8);
  const w = Math.max(18, Math.min(80, doc.widthOfString(t) + padX * 2));
  doc.roundedRect(x, y + 2, w, h, 6).fill(bg);
  doc.fillColor(fg).text(t, x, y + 4, { width: w, align: "center" });
  doc.restore();
}

export async function generateUserRecommendationsReportPdf({ userId, from, to }) {
  const fromD = ensureDate(from, "from");
  const toD = ensureDate(to, "to");
  if (toD < fromD) throw new ApiError(400, "Invalid date range: to must be after from");

  const user = await User.findById(userId).select("name email preferences").lean();
  if (!user) throw new ApiError(404, "User not found");

  const items = await Recommendation.find({
    userId,
    saved: true,
    createdAt: { $gte: fromD, $lte: toD },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const totals = {
    total: items.length,
    saved: 0,
    done: 0,
    dismissed: 0,
    useful: 0,
    notUseful: 0,
    avgEstimatedKgSaved: 0,
  };

  let sumKg = 0;
  for (const r of items) {
    if (r.status === "done") totals.done += 1;
    else if (r.status === "dismissed") totals.dismissed += 1;
    else totals.saved += 1;

    if (r.rating === "useful") totals.useful += 1;
    if (r.rating === "not_useful") totals.notUseful += 1;

    sumKg += Number(r?.evidence?.estimatedKgSaved ?? 0) || 0;
  }
  totals.avgEstimatedKgSaved = totals.total ? safeNum(sumKg / totals.total, 2) : 0;

  const feedbackCount = totals.useful + totals.notUseful;
  const usefulRate = feedbackCount ? totals.useful / feedbackCount : null;
  const doneRate = totals.total ? totals.done / totals.total : null;

  const top = items.slice(0, 12);

  return renderPdf((doc) => {
    drawBrandHeader(doc, {
      title: "EcoTrack — Recommendations Report",
      subtitle: `Generated ${fmtDateTime(new Date())} • ${fmtDate(fromD)} → ${fmtDate(toD)}`,
    });

    sectionTitle(doc, "Report context");
    keyValue(doc, "User", `${user.name} <${user.email}>`);
    keyValue(doc, "Range", `${fmtDate(fromD)} → ${fmtDate(toD)}`);

    const diet = user?.preferences?.diet;
    const transport = user?.preferences?.transportMode;
    const excluded = user?.preferences?.recommendations?.excludedRuleIds;

    doc.moveDown(0.2);
    keyValue(doc, "Diet preference", diet || "—");
    keyValue(doc, "Transport mode", transport || "—");
    keyValue(doc, "Excluded ruleIds", Array.isArray(excluded) && excluded.length ? excluded.join(", ") : "—");

    sectionTitle(doc, "Summary");

    drawKpiRow(doc, [
      { label: "Saved", value: totals.total, sub: "items in range" },
      { label: "Done", value: totals.done, sub: `Rate: ${pct(doneRate)}` },
      { label: "Useful", value: totals.useful, sub: `Rate: ${pct(usefulRate)}` },
      { label: "Avg savings", value: `${totals.avgEstimatedKgSaved} kg`, sub: "estimated CO2e" },
    ]);

    keyValue(doc, "Dismissed", totals.dismissed);
    keyValue(doc, "Not useful feedback", totals.notUseful);

    sectionTitle(doc, "Most recent saved recommendations");
    doc.fontSize(9).fillColor(BRAND.text).font("Helvetica");

    const startX = doc.x;
    let y = doc.y;

    const cols = {
      rule: startX,
      status: startX + 110,
      rating: startX + 180,
      kg: startX + 260,
      date: startX + 330,
    };

    const headers = [
      { key: "rule", label: "Rule", width: 105 },
      { key: "status", label: "Status", width: 65 },
      { key: "rating", label: "Rating", width: 70 },
      { key: "kg", label: "kg saved", width: 65 },
      { key: "date", label: "Created", width: 160 },
    ];

    y = drawTableHeader(doc, { y, cols, headers });
    doc.fillColor(BRAND.text).font("Helvetica").fontSize(9);

    let zebra = false;
    for (const r of top) {
      if (y > 760) {
        doc.addPage();
        y = doc.y;
        y = drawTableHeader(doc, { y, cols, headers });
        zebra = false;
      }

      zebra = !zebra;
      drawZebraRow(doc, { y, zebraOn: zebra });

      doc.text(r.ruleId || "unknown", cols.rule, y, { width: 105, ellipsis: true });

      const status = r.status || "saved";
      const rating = r.rating || "—";
      const statusBg = status === "done" ? BRAND.emerald : status === "dismissed" ? "#334155" : BRAND.cyan;
      const ratingBg = rating === "useful" ? BRAND.emerald : rating === "not_useful" ? "#ef4444" : "#64748b";
      drawBadge(doc, { text: status, x: cols.status, y, bg: statusBg });
      drawBadge(doc, { text: rating, x: cols.rating, y, bg: ratingBg });

      doc.text(String(safeNum(r?.evidence?.estimatedKgSaved ?? 0, 2)), cols.kg, y, { width: 65 });
      doc.text(fmtDate(r.createdAt), cols.date, y, { width: 160 });
      y += 16;
    }

    doc.moveDown(0.8);
    doc.fontSize(8).fillColor(BRAND.muted).font("Helvetica").text(
      "Notes: This report summarizes saved recommendations and user feedback within the selected range. Estimated impact values are approximations.",
      { align: "left" }
    );
  });
}

export async function generateAdminRecommendationsReportPdf({ from, to, limit = 20 }) {
  const fromD = from ? ensureDate(from, "from") : null;
  const toD = to ? ensureDate(to, "to") : null;
  if (fromD && toD && toD < fromD) throw new ApiError(400, "Invalid date range: to must be after from");

  const analytics = await getGlobalRecommendationAnalytics({ from: fromD, to: toD, limit });

  return renderPdf((doc) => {
    drawBrandHeader(doc, {
      title: "EcoTrack — Admin Effectiveness Report",
      subtitle: `Generated ${fmtDateTime(new Date())}`,
    });

    sectionTitle(doc, "Report scope");
    keyValue(
      doc,
      "Range",
      `${analytics.range.from ? fmtDate(analytics.range.from) : "—"} → ${analytics.range.to ? fmtDate(analytics.range.to) : "—"}`
    );
    keyValue(doc, "Top rules limit", analytics.limit);

    sectionTitle(doc, "Global summary");
    const feedbackCount = Number(analytics.summary.useful ?? 0) + Number(analytics.summary.notUseful ?? 0);
    const usefulRate = feedbackCount ? Number(analytics.summary.useful ?? 0) / feedbackCount : null;
    const doneRate = analytics.summary.total ? Number(analytics.summary.done ?? 0) / Number(analytics.summary.total ?? 1) : null;

    drawKpiRow(doc, [
      { label: "Saved", value: analytics.summary.total, sub: "items" },
      { label: "Users", value: analytics.summary.users, sub: "distinct" },
      { label: "Useful rate", value: pct(usefulRate), sub: `Done: ${pct(doneRate)}` },
      { label: "Avg savings", value: `${safeNum(analytics.summary.avgEstimatedKgSaved ?? 0, 2)} kg`, sub: "estimated CO2e" },
    ]);

    keyValue(doc, "Dismissed", analytics.summary.dismissed);
    keyValue(doc, "Useful feedback", analytics.summary.useful);
    keyValue(doc, "Not useful feedback", analytics.summary.notUseful);

    sectionTitle(doc, "Effectiveness by ruleId (top rules)");

    const rows = analytics.byRule || [];
    const startX = doc.x;
    let y = doc.y;

    const cols = {
      rule: startX,
      total: startX + 140,
      useful: startX + 190,
      done: startX + 260,
      dismiss: startX + 330,
      kg: startX + 420,
    };

    const headers = [
      { key: "rule", label: "Rule", width: 135 },
      { key: "total", label: "Total", width: 40 },
      { key: "useful", label: "Useful%", width: 60 },
      { key: "done", label: "Done%", width: 60 },
      { key: "dismiss", label: "Dismiss%", width: 70 },
      { key: "kg", label: "Avg kg", width: 70 },
    ];

    y = drawTableHeader(doc, { y, cols, headers });
    doc.fillColor(BRAND.text).font("Helvetica").fontSize(9);

    let zebra = false;
    for (const r of rows) {
      if (y > 760) {
        doc.addPage();
        y = doc.y;
        y = drawTableHeader(doc, { y, cols, headers });
        zebra = false;
      }

      zebra = !zebra;
      drawZebraRow(doc, { y, zebraOn: zebra });

      doc.text(r.ruleId, cols.rule, y, { width: 135, ellipsis: true });
      doc.text(String(r.total ?? 0), cols.total, y, { width: 40 });

      doc.save();
      doc.fillColor(rateColor(r.usefulRate));
      doc.text(pct(r.usefulRate), cols.useful, y, { width: 60 });
      doc.restore();

      doc.save();
      doc.fillColor(rateColor(r.doneRate));
      doc.text(pct(r.doneRate), cols.done, y, { width: 60 });
      doc.restore();

      doc.save();
      // For dismiss%, higher is worse, so invert the color logic.
      const d = clamp01(r.dismissRate);
      const dismissColor = d === null ? BRAND.muted : d <= 0.2 ? BRAND.emerald : d <= 0.5 ? "#f59e0b" : "#ef4444";
      doc.fillColor(dismissColor);
      doc.text(pct(r.dismissRate), cols.dismiss, y, { width: 70 });
      doc.restore();

      doc.text(String(safeNum(r.avgEstimatedKgSaved ?? 0, 2)), cols.kg, y, { width: 70 });
      y += 16;
    }

    doc.moveDown(0.8);
    doc.fontSize(8).fillColor(BRAND.muted).font("Helvetica").text(
      "Notes: Useful rate is computed from feedback only (useful vs not_useful). Done/dismiss rates are computed over all saved recommendations. Use this report to validate real-world impact and iterate recommendation rules.",
      { align: "left" }
    );
  });
}
