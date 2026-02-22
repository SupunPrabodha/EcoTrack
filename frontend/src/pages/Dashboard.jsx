import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import Stat from "../components/Stat";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  IconBarChart,
  IconBolt,
  IconCalendar,
  IconEdit,
  IconFlame,
  IconGlobe,
  IconLeaf,
  IconLightbulb,
  IconMap,
  IconPuzzle,
  IconRefresh,
  IconTarget,
  IconWarning,
  IconLineChart,
} from "../components/Icons";

function isoRange7Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  from.setHours(0,0,0,0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Dashboard() {
  const range = useMemo(() => isoRange7Days(), []);

  const DASHBOARD_STALE_MS = 30_000;
  const DASHBOARD_GC_MS = 10 * 60_000;
  const INTEGRATIONS_STALE_MS = 5 * 60_000;
  const TIPS_STALE_MS = 30 * 60_000;
  const TIPS_GC_MS = 2 * 60 * 60_000;

  const fromLabel = useMemo(() => {
    try {
      return new Date(range.from).toLocaleDateString();
    } catch {
      return "";
    }
  }, [range.from]);

  const toLabel = useMemo(() => {
    try {
      return new Date(range.to).toLocaleDateString();
    } catch {
      return "";
    }
  }, [range.to]);

  const summaryQ = useQuery({
    queryKey: ["summary", range],
    queryFn: async () => (await api.get("/emissions/summary", { params: range })).data.data,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: DASHBOARD_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const trendsQ = useQuery({
    queryKey: ["trends", range],
    queryFn: async () => (await api.get("/emissions/trends", { params: range })).data.data,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: DASHBOARD_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const integrationsQ = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => (await api.get("/health/integrations")).data.data,
    staleTime: INTEGRATIONS_STALE_MS,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const recentQ = useQuery({
    queryKey: ["recent-emissions"],
    queryFn: async () => (await api.get("/emissions", { params: { page: 1, limit: 10 } })).data.data,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: DASHBOARD_GC_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const tipsQ = useQuery({
    queryKey: ["dashboard-tips", range],
    queryFn: async () => (await api.get("/recommendations/generate", { params: range })).data.data,
    enabled: (summaryQ.data?.count ?? 0) > 0,
    placeholderData: (prev) => prev,
    staleTime: TIPS_STALE_MS,
    gcTime: TIPS_GC_MS,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const trendSeries = useMemo(
    () => (trendsQ.data || []).map((d) => ({ date: d._id, kg: Number(d.totalKg?.toFixed?.(2) ?? d.totalKg ?? 0) })),
    [trendsQ.data]
  );

  const trendStats = useMemo(() => {
    const total = Number(summaryQ.data?.totalKg ?? 0);
    const days = Math.max(1, (trendSeries || []).length || 7);
    const avg = total / days;
    let peak = null;
    for (const p of trendSeries || []) {
      if (!peak || (p.kg ?? 0) > (peak.kg ?? 0)) peak = p;
    }
    return {
      totalKg: total,
      count: Number(summaryQ.data?.count ?? 0),
      avgKgPerDay: avg,
      peak,
    };
  }, [summaryQ.data?.totalKg, summaryQ.data?.count, trendSeries]);

  const breakdown = useMemo(() => {
    const rows = Array.isArray(summaryQ.data?.byType) ? summaryQ.data.byType : [];
    const total = Number(summaryQ.data?.totalKg ?? 0) || 0;
    const cleaned = rows
      .filter((r) => r && r._id)
      .map((r) => ({ type: r._id, kg: Number(r.totalKg ?? 0), count: Number(r.count ?? 0) }))
      .sort((a, b) => b.kg - a.kg);
    return {
      total,
      rows: cleaned,
    };
  }, [summaryQ.data]);

  const methodBadge = (m) => {
    if (m === "carbon_interface") return { label: "3rd‑party", sub: "Carbon Interface" };
    if (m === "grid_intensity") return { label: "3rd‑party", sub: "Grid Intensity" };
    if (m === "local_factor") return { label: "Fallback", sub: "Local factor" };
    if (m === "invalid_input") return { label: "Input", sub: "Invalid" };
    if (m === "unknown_type") return { label: "Type", sub: "Unknown" };
    return null;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-emerald-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="animate-float text-emerald-300">
              <IconGlobe width={44} height={44} />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Dashboard
              </div>
              <div className="text-slate-400 text-sm mt-1">Track your environmental impact in real-time</div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-emerald-500/15 bg-slate-900/40">
                  <IconCalendar width={14} height={14} />
                  <span>
                    {fromLabel} → {toLabel}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-emerald-500/15 bg-slate-900/40">
                  <IconBolt width={14} height={14} />
                  <span>Live insights</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-6">

        {(summaryQ.isError || trendsQ.isError) && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm shadow-lg shadow-red-500/10">
            <span className="inline-flex items-center gap-2">
              <IconWarning width={18} height={18} />
              <span>Failed to load dashboard data. Please try again.</span>
            </span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          <Stat
            label="Total emissions (last 7 days)"
            value={summaryQ.isLoading ? "…" : `${Number(summaryQ.data?.totalKg ?? 0).toFixed(2)} kg`}
            sub={(
              <span className="inline-flex items-center gap-2">
                <IconLeaf width={16} height={16} />
                <span>
                  Logged entries: {summaryQ.data?.count ?? 0} · Avg/day: {Number(trendStats.avgKgPerDay || 0).toFixed(2)} kg
                </span>
              </span>
            )}
          />

          <Stat
            label="Grid intensity (gCO2/kWh)"
            value={summaryQ.isLoading ? "…" : (summaryQ.data?.gridIntensityGPerKwh ?? "—")}
            sub={
              summaryQ.data?.gridIntensityGPerKwh
                ? (
                  <span className="inline-flex items-center gap-2">
                    <IconBolt width={16} height={16} />
                    <span>Source: Carbon Intensity API</span>
                  </span>
                )
                : "Not available (API key/region or network)"
            }
          />

          <Card title="Integrations">
            {integrationsQ.isLoading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : integrationsQ.isError ? (
              <div className="text-sm text-slate-400">Unavailable.</div>
            ) : (
              <div className="text-sm text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${integrationsQ.data?.openWeather?.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span>Weather: {integrationsQ.data?.openWeather?.enabled ? "enabled" : "disabled"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${integrationsQ.data?.carbonInterface?.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span>Carbon Interface: {integrationsQ.data?.carbonInterface?.enabled ? "enabled" : "disabled"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${integrationsQ.data?.email?.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span>Email: {integrationsQ.data?.email?.enabled ? integrationsQ.data?.email?.provider : "disabled"}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <IconLineChart width={16} height={16} />
                  <span>Trend (kg CO2e per day)</span>
                </span>
              }
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1.5 rounded-xl text-xs border border-emerald-500/15 bg-slate-900/40 text-slate-300">
                  Total: <span className="text-emerald-300 font-semibold">{Number(trendStats.totalKg || 0).toFixed(2)} kg</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl text-xs border border-emerald-500/15 bg-slate-900/40 text-slate-300">
                  Avg/day: <span className="text-cyan-300 font-semibold">{Number(trendStats.avgKgPerDay || 0).toFixed(2)} kg</span>
                </span>
                {trendStats.peak?.date ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs border border-emerald-500/15 bg-slate-900/40 text-slate-300">
                    Peak: <span className="text-slate-100 font-semibold">{trendStats.peak.date}</span> · {Number(trendStats.peak.kg || 0).toFixed(2)} kg
                  </span>
                ) : null}
              </div>

              <div className="h-72">
                {trendsQ.isLoading ? (
                  <div className="h-full grid place-items-center text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin text-emerald-300">
                        <IconRefresh width={28} height={28} />
                      </div>
                      <div>Loading chart…</div>
                    </div>
                  </div>
                ) : (trendSeries || []).length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-slate-400">
                    <div className="text-center">
                      <div className="text-emerald-300 mb-3 grid place-items-center">
                        <IconLeaf width={32} height={32} />
                      </div>
                      <div>No emissions logged yet.</div>
                      <div className="mt-1 text-xs">Add a habit to see trends.</div>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Link
                          to="/habits"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
                        >
                          Log a habit
                        </Link>
                        <Link
                          to="/emissions"
                          className="px-4 py-2 rounded-xl border border-emerald-500/20 bg-slate-900/40 hover:bg-emerald-500/10 text-slate-200 text-sm transition-all"
                        >
                          Add manual entry
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendSeries}>
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Line type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <IconFlame width={16} height={16} />
                  <span>Recent activity</span>
                </span>
              }
            >
              {recentQ.isLoading ? (
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="animate-spin text-emerald-300">
                    <IconRefresh width={16} height={16} />
                  </span>
                  <span>Loading…</span>
                </div>
              ) : recentQ.isError ? (
                <div className="text-sm text-slate-400">Failed to load recent activity.</div>
              ) : (recentQ.data?.items || []).length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-8">
                  <div className="text-emerald-300 mb-2 grid place-items-center">
                    <IconBarChart width={28} height={28} />
                  </div>
                  <div>No emissions logged yet.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(recentQ.data?.items || []).map((e) => (
                    <div key={e._id} className="flex items-center justify-between gap-3 text-sm border-b border-emerald-500/10 pb-3 hover:bg-emerald-500/5 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="min-w-0">
                        <div className="text-slate-200 truncate font-medium">
                          <span className="inline-flex items-center gap-2">
                            {e.sourceType === "habit" ? <IconLeaf width={16} height={16} /> : <IconEdit width={16} height={16} />}
                            <span>{e.sourceType === "habit" ? "Habit" : "Manual"}</span>
                          </span>
                          {e.habitType ? ` · ${e.habitType}` : ""}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(e.date).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const b = methodBadge(e.calculationMethod);
                          return b ? (
                            <div className="hidden sm:flex flex-col items-end">
                              <span className="px-2 py-1 rounded-lg text-[10px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                                {b.label}
                              </span>
                              <span className="mt-1 text-[10px] text-slate-500">{b.sub}</span>
                            </div>
                          ) : null;
                        })()}
                        <div className="text-slate-200 whitespace-nowrap font-semibold">
                          {Number(e.emissionKg || 0).toFixed?.(2) ?? e.emissionKg} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <IconBolt width={16} height={16} />
                  <span>Quick actions</span>
                </span>
              }
            >
              <div className="grid gap-3">
                <Link
                  to="/habits"
                  className="group flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-slate-900/40 hover:bg-emerald-500/10 px-4 py-3 transition-all"
                >
                  <div>
                    <div className="text-slate-100 font-semibold">Log a habit</div>
                    <div className="text-xs text-slate-400">Fastest way to update your footprint</div>
                  </div>
                  <div className="text-emerald-300">
                    <IconLeaf width={22} height={22} />
                  </div>
                </Link>

                <Link
                  to="/emissions"
                  className="group flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-slate-900/40 hover:bg-emerald-500/10 px-4 py-3 transition-all"
                >
                  <div>
                    <div className="text-slate-100 font-semibold">Add manual emission</div>
                    <div className="text-xs text-slate-400">Record anything not covered by habits</div>
                  </div>
                  <div className="text-emerald-300">
                    <IconEdit width={22} height={22} />
                  </div>
                </Link>

                <Link
                  to="/goals"
                  className="group flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-slate-900/40 hover:bg-emerald-500/10 px-4 py-3 transition-all"
                >
                  <div>
                    <div className="text-slate-100 font-semibold">Review goals</div>
                    <div className="text-xs text-slate-400">Stay on track with targets</div>
                  </div>
                  <div className="text-emerald-300">
                    <IconTarget width={22} height={22} />
                  </div>
                </Link>

                <Link
                  to="/map"
                  className="group flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-slate-900/40 hover:bg-emerald-500/10 px-4 py-3 transition-all"
                >
                  <div>
                    <div className="text-slate-100 font-semibold">Open environmental map</div>
                    <div className="text-xs text-slate-400">Air quality and weather nearby</div>
                  </div>
                  <div className="text-emerald-300">
                    <IconMap width={22} height={22} />
                  </div>
                </Link>
              </div>
            </Card>

            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <IconPuzzle width={16} height={16} />
                  <span>Footprint breakdown</span>
                </span>
              }
            >
              {summaryQ.isLoading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : breakdown.rows.length === 0 ? (
                <div className="text-sm text-slate-400">No category data yet.</div>
              ) : (
                <div className="space-y-3">
                  {breakdown.rows.slice(0, 5).map((r) => {
                    const pct = breakdown.total > 0 ? Math.round((r.kg / breakdown.total) * 100) : 0;
                    return (
                      <div key={r.type}>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-200 font-medium">{r.type}</div>
                          <div className="text-slate-300">{r.kg.toFixed(2)} kg · {pct}%</div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-900/60 border border-emerald-500/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500/70 to-cyan-500/70"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <IconLightbulb width={16} height={16} />
                  <span>Smart tips</span>
                </span>
              }
            >
              {tipsQ.isLoading ? (
                <div className="text-sm text-slate-400">Generating tips…</div>
              ) : tipsQ.isError ? (
                <div className="text-sm text-slate-400">Tips unavailable right now.</div>
              ) : (
                <div className="space-y-3">
                  {(tipsQ.data?.tips || []).slice(0, 2).map((t) => (
                    <div key={t.title} className="rounded-2xl border border-emerald-500/15 bg-slate-900/40 p-4">
                      <div className="text-slate-100 font-semibold">{t.title}</div>
                      <div className="text-xs text-slate-400 mt-1">Impact: {t.impact || "—"}</div>
                      <div className="text-sm text-slate-300 mt-2 line-clamp-3">{t.body}</div>
                    </div>
                  ))}
                  <Link
                    to="/recommendations"
                    className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl border border-emerald-500/20 bg-slate-900/40 hover:bg-emerald-500/10 text-slate-200 text-sm transition-all"
                  >
                    View all recommendations
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
