import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { useQuery } from "@tanstack/react-query";
import Card from "./Card";
import { api } from "../api/client";

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Custom", value: "custom" },
];

function getRange(value, customFrom, customTo) {
  const now = new Date();
  if (value === "7d") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (value === "30d") {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  // custom
  return { from: customFrom, to: customTo };
}

export default function EmissionsLineChart() {
  const [rangeType, setRangeType] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => getRange(rangeType, customFrom, customTo), [rangeType, customFrom, customTo]);

  const trendsQ = useQuery({
    queryKey: ["trends", range],
    queryFn: async () => (await api.get("/emissions/trends", { params: range })).data.data,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Calculate trend indicator (bonus)
  const trendIndicator = useMemo(() => {
    if (!Array.isArray(trendsQ.data) || trendsQ.data.length < 8) return null;
    // Compare last 7 days to previous 7 days
    const last7 = trendsQ.data.slice(-7).reduce((sum, d) => sum + (d.totalKg || 0), 0);
    const prev7 = trendsQ.data.slice(-14, -7).reduce((sum, d) => sum + (d.totalKg || 0), 0);
    if (prev7 === 0) return null;
    const pct = ((last7 - prev7) / prev7) * 100;
    return pct;
  }, [trendsQ.data]);

  // Prepare chart data
  const chartData = Array.isArray(trendsQ.data)
    ? trendsQ.data.map((d) => ({ date: d._id, kg: Number(d.totalKg ?? 0) }))
    : [];

  return (
    <Card title="Emissions Over Time (Line Chart)">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`px-3 py-1.5 rounded-xl text-xs border border-emerald-500/15 bg-slate-900/40 text-slate-300 transition-all ${rangeType === opt.value ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" : "hover:bg-emerald-500/10"}`}
            onClick={() => setRangeType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        {rangeType === "custom" && (
          <>
            <input
              type="date"
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-2 py-1 text-xs"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-2 py-1 text-xs"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        )}
        {trendIndicator !== null && (
          <span className={`ml-4 text-xs font-semibold ${trendIndicator > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {trendIndicator > 0 ? "▲" : "▼"} {Math.abs(trendIndicator).toFixed(1)}% compared to last week
          </span>
        )}
      </div>
      <div className="h-80">
        {trendsQ.isLoading ? (
          <div className="h-full grid place-items-center text-sm text-slate-400">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-slate-400">No data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }} labelStyle={{ color: "#e2e8f0" }} />
              <Legend />
              <Line type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2} dot={false} name="Emissions (kg CO₂)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
