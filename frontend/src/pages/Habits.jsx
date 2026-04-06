import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import { IconCalendar, IconEdit, IconLeaf, IconRefresh, IconSave, IconSparkles, IconTrash } from "../components/Icons";

function dateOnly(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthOnly(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function isoRangeFromDates(fromDate, toDate) {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Habits() {
  const qc = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return dateOnly(d);
  });
  const [toDate, setToDate] = useState(() => dateOnly(now));

  const [type, setType] = useState("car_km");
  const [value, setValue] = useState(5);

  const [filterType, setFilterType] = useState("");

  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return monthOnly(d);
  });

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const todayStr = useMemo(() => dateOnly(now), [now]);
  const todayRange = useMemo(() => isoRangeFromDates(todayStr, todayStr), [todayStr]);
  const range = useMemo(() => isoRangeFromDates(fromDate, toDate), [fromDate, toDate]);

  const todayLogsQ = useQuery({
    queryKey: ["habits", "today", todayRange, filterType],
    queryFn: async () =>
      (
        await api.get("/habits", {
          params: {
            ...todayRange,
            page: 1,
            limit: 100,
            ...(filterType ? { type: filterType } : {}),
          },
        })
      ).data,
  });

  const totalQ = useQuery({
    queryKey: ["habits-summary", "total", range, filterType],
    queryFn: async () =>
      (await api.get("/habits/summary", { params: { ...range, ...(filterType ? { type: filterType } : {}) } })).data
  });

  const monthlyReportQ = useQuery({
    queryKey: ["monthly-report", reportMonth],
    queryFn: async () => (await api.get("/reports/monthly", { params: { month: reportMonth } })).data.data,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const monthlySeries = useMemo(
    () => (monthlyReportQ.data?.trends || []).map((d) => ({ date: d._id, kg: Number(d.totalKg?.toFixed?.(2) ?? d.totalKg ?? 0) })),
    [monthlyReportQ.data?.trends]
  );

  const downloadMonthlyPdf = async () => {
    const report = monthlyReportQ.data;
    if (!report) return;

    const pageWidth = 595.28; // A4 width in pt
    const headerH = 84;

    async function svgUrlToPngDataUrl(url, w, h) {
      const res = await fetch(url);
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);

      try {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = blobUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    let y = headerH + 28;

    // Branded header (emerald + cyan accent)
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, headerH, "F");
    doc.setFillColor(6, 182, 212);
    doc.rect(0, headerH - 6, pageWidth, 6, "F");

    const logoPng = await svgUrlToPngDataUrl("/ecotrack-icon.svg", 64, 64);
    if (logoPng) {
      doc.addImage(logoPng, "PNG", marginX, 16, 40, 40);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("EcoTrack", logoPng ? marginX + 52 : marginX, 36);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Monthly Emissions Report", logoPng ? marginX + 52 : marginX, 56);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Month: ${reportMonth}`, marginX, y);
    y += 16;
    doc.text(`Total emissions: ${Number(report?.summary?.totalKg ?? 0).toFixed(2)} kg CO2e`, marginX, y);
    y += 16;
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.text("Daily breakdown", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const rows = Array.isArray(report?.trends) ? report.trends : [];
    if (rows.length === 0) {
      doc.text("No data for this month.", marginX, y);
    } else {
      for (const r of rows) {
        const line = `${r._id}: ${Number(r.totalKg ?? 0).toFixed(2)} kg`;
        if (y > 770) {
          doc.addPage();
          y = 56;
        }
        doc.text(line, marginX, y);
        y += 14;
      }
    }

    doc.save(`EcoTrack-monthly-report-${reportMonth}.pdf`);
  };

  const createM = useMutation({
    mutationFn: async () => api.post("/habits", { type, value: Number(value), date: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits-summary"] });
      qc.invalidateQueries({ queryKey: ["habits", "today"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, value }) => api.patch(`/habits/${id}`, { value: Number(value) }),
    onSuccess: () => {
      setEditingId(null);
      setEditValue("");
      qc.invalidateQueries({ queryKey: ["habits-summary"] });
      qc.invalidateQueries({ queryKey: ["habits", "today"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    }
  });

  const deleteM = useMutation({
    mutationFn: async (id) => api.delete(`/habits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits-summary"] });
      qc.invalidateQueries({ queryKey: ["habits", "today"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    }
  });

  const typeLabel = (t) => {
    if (t === "car_km") return "Car travel";
    if (t === "public_transport_km") return "Public transport";
    if (t === "electricity_kwh") return "Electricity";
    if (t === "meat_meals") return "Meat meals";
    if (t === "plastic_items") return "Plastic items";
    return t;
  };

  const unitLabel = (t) => {
    if (t === "car_km") return "km";
    if (t === "public_transport_km") return "km";
    if (t === "electricity_kwh") return "kWh";
    if (t === "meat_meals") return "meals";
    if (t === "plastic_items") return "items";
    return "";
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-5">
        <div>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-300">
                <IconLeaf width={22} height={22} />
              </span>
              Habits
            </span>
          </div>
          <div className="text-slate-400 text-sm">Track your daily eco-friendly actions</div>
        </div>

        <Card title="Filters">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">From</div>
              <input
                type="date"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">To</div>
              <input
                type="date"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Type</div>
              <select
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="car_km">Car travel (km)</option>
                <option value="public_transport_km">Public transport (km)</option>
                <option value="electricity_kwh">Electricity (kWh)</option>
                <option value="meat_meals">Meat meals</option>
                <option value="plastic_items">Plastic items</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                className="flex-1 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm py-2 transition-all"
                onClick={() => {
                  setFromDate(() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    return dateOnly(d);
                  });
                  setToDate(dateOnly(new Date()));
                  setFilterType("");
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <IconRefresh width={16} height={16} />
                  Reset
                </span>
              </button>
            </div>
          </div>
        </Card>

        <Card title="Log a habit (today)">
          <div className="grid md:grid-cols-3 gap-3">
            <select
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="car_km">Car travel (km)</option>
              <option value="public_transport_km">Public transport (km)</option>
              <option value="electricity_kwh">Electricity (kWh)</option>
              <option value="meat_meals">Meat meals</option>
              <option value="plastic_items">Plastic items</option>
            </select>

            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Enter value"
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />

            <button
              onClick={() => createM.mutate()}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
              disabled={createM.isPending}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <IconSparkles width={18} height={18} />
                Add
              </span>
            </button>
          </div>

          {createM.isError && (
            <div className="mt-3 text-sm text-red-300">
              {createM.error?.response?.data?.message || "Failed to add habit"}
            </div>
          )}
        </Card>

        <Card title="Today (carbon emission)">
          {todayLogsQ.isLoading ? (
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <span className="animate-spin text-emerald-300">
                <IconRefresh width={16} height={16} />
              </span>
              <span>Loading today’s logs…</span>
            </div>
          ) : todayLogsQ.isError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm">
              Failed to load today’s habits.
            </div>
          ) : (todayLogsQ.data?.data?.items || []).length === 0 ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-5 py-4 text-sm text-slate-400">
              No habits logged today yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800/70 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs text-slate-400 bg-slate-950/40">
                <div className="col-span-5">Habit</div>
                <div className="col-span-3">Value</div>
                <div className="col-span-2 text-right">Emission</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {(todayLogsQ.data?.data?.items || []).map((h) => (
                  <div
                    key={h._id}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center"
                  >
                    <div className="md:col-span-5 min-w-0">
                      <div className="text-slate-200 font-medium truncate">{typeLabel(h.type)}</div>
                      <div className="text-xs text-slate-500 mt-0.5 md:hidden">
                        Emission: {Number(h.emissionKg || 0).toFixed?.(2) ?? h.emissionKg} kg CO₂e
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <div className="text-xs text-slate-500 mb-1 md:hidden">Value</div>
                      {editingId === h._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="w-full md:w-36 bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                          <span className="text-xs text-slate-500 shrink-0">{unitLabel(h.type)}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300">
                          {Number(h.value || 0).toFixed?.(1) ?? h.value} {unitLabel(h.type)}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 text-right hidden md:block">
                      <div className="text-sm text-slate-300 whitespace-nowrap">
                        {Number(h.emissionKg || 0).toFixed?.(2) ?? h.emissionKg} kg CO₂e
                      </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2">
                      {editingId === h._id ? (
                        <>
                          <button
                            className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-sm disabled:opacity-50"
                            disabled={updateM.isPending}
                            onClick={() => updateM.mutate({ id: h._id, value: editValue })}
                          >
                            <span className="inline-flex items-center gap-2">
                              <IconSave width={16} height={16} />
                              Save
                            </span>
                          </button>
                          <button
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditValue("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
                            onClick={() => {
                              setEditingId(h._id);
                              setEditValue(String(h.value ?? ""));
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <IconEdit width={16} height={16} />
                              Edit
                            </span>
                          </button>
                          <button
                            className="px-3 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-sm disabled:opacity-50"
                            disabled={deleteM.isPending}
                            onClick={() => deleteM.mutate(h._id)}
                          >
                            <span className="inline-flex items-center gap-2">
                              <IconTrash width={16} height={16} />
                              Delete
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Total (up to today)">
          {totalQ.isLoading ? (
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <span className="animate-spin text-emerald-300">
                <IconRefresh width={16} height={16} />
              </span>
              <span>Loading totals…</span>
            </div>
          ) : totalQ.isError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm">
              Failed to load totals.
            </div>
          ) : (totalQ.data?.data?.items || []).length === 0 ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-5 py-4 text-sm text-slate-400">
              No logs in this range yet. Add one above.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800/70 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs text-slate-400 bg-slate-950/40">
                <div className="col-span-5">Habit</div>
                <div className="col-span-3">Total value</div>
                <div className="col-span-2 text-right">Days</div>
                <div className="col-span-2 text-right">Emission</div>
              </div>
              <div className="divide-y divide-slate-800/60">
                {(totalQ.data?.data?.items || []).map((row) => (
                  <div
                    key={row.type}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center"
                  >
                    <div className="md:col-span-5 min-w-0">
                      <div className="text-slate-200 font-medium truncate">{typeLabel(row.type)}</div>
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-xs text-slate-500 mb-1 md:hidden">Total value</div>
                      <div className="text-sm text-slate-300">
                        {Number(row.totalValue || 0).toFixed?.(1) ?? row.totalValue} {unitLabel(row.type)}
                      </div>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <div className="text-xs text-slate-500 mb-1 md:hidden">Days</div>
                      <div className="text-sm text-slate-300">
                        {row.entries} day{row.entries === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <div className="text-xs text-slate-500 mb-1 md:hidden">Emission</div>
                      <div className="text-sm text-slate-300 whitespace-nowrap">
                        {Number(row.totalEmissionKg || 0).toFixed?.(2) ?? row.totalEmissionKg} kg CO₂e
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title={null}>
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-slate-950/30 to-cyan-500/10 p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-900/60 border border-emerald-500/20 grid place-items-center shrink-0">
                  <img src="/ecotrack-icon.svg" alt="EcoTrack" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent truncate">
                    Monthly report
                  </div>
                  <div className="text-xs text-slate-400 truncate">Month overview + downloadable PDF</div>
                </div>
              </div>
              <div className="text-emerald-300/80">
                <IconCalendar width={20} height={20} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Month</div>
              <input
                type="month"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                disabled={monthlyReportQ.isLoading || monthlyReportQ.isError || !monthlyReportQ.data}
                onClick={downloadMonthlyPdf}
              >
                Download PDF
              </button>
            </div>
          </div>

          {monthlyReportQ.isLoading ? (
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <span className="animate-spin text-emerald-300">
                <IconRefresh width={16} height={16} />
              </span>
              <span>Generating report…</span>
            </div>
          ) : monthlyReportQ.isError ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-5 py-4 text-sm text-slate-400">
              Failed to load monthly report.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1.5 rounded-xl text-xs border border-emerald-500/15 bg-slate-900/40 text-slate-300">
                  Total:{" "}
                  <span className="text-emerald-300 font-semibold">
                    {Number(monthlyReportQ.data?.summary?.totalKg ?? 0).toFixed(2)} kg
                  </span>
                </span>
              </div>

              <div className="h-64">
                {(monthlySeries || []).length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-slate-400">No data for this month.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlySeries}>
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Line type="monotone" dataKey="kg" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
