import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { IconLeaf, IconSparkles } from "../components/Icons";

function dateOnly(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const [page, setPage] = useState(1);
  const limit = 10;

  const range = useMemo(() => isoRangeFromDates(fromDate, toDate), [fromDate, toDate]);

  const listQ = useQuery({
    queryKey: ["habits", range, page, filterType],
    queryFn: async () =>
      (await api.get("/habits", { params: { ...range, page, limit, ...(filterType ? { type: filterType } : {}) } })).data
  });

  const createM = useMutation({
    mutationFn: async () => api.post("/habits", { type, value: Number(value), date: new Date().toISOString() }),
    onSuccess: () => {
      setPage(1);
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    }
  });

  const methodLabel = (m) => {
    if (m === "carbon_interface") return "Carbon Interface";
    if (m === "grid_intensity") return "Grid Intensity";
    if (m === "local_factor") return "Local factor";
    if (m === "invalid_input") return "Invalid input";
    if (m === "unknown_type") return "Unknown";
    return m || "—";
  };

  const methodBadgeClass = (m) => {
    if (m === "carbon_interface") return "border-emerald-900 bg-emerald-950/30 text-emerald-200";
    if (m === "grid_intensity") return "border-sky-900 bg-sky-950/30 text-sky-200";
    if (m === "local_factor") return "border-slate-800 bg-slate-950/40 text-slate-200";
    return "border-slate-800 bg-slate-950/40 text-slate-300";
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
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">To</div>
              <input
                type="date"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Type</div>
              <select
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
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
                  setPage(1);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </Card>

        <Card title="Log a habit (today)">
          <div className="grid md:grid-cols-3 gap-3">
            <select className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={type} onChange={(e) => setType(e.target.value)}>
              <option value="car_km">Car travel (km)</option>
              <option value="public_transport_km">Public transport (km)</option>
              <option value="electricity_kwh">Electricity (kWh)</option>
              <option value="meat_meals">Meat meals</option>
              <option value="plastic_items">Plastic items</option>
            </select>

            <input type="number" className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={value} onChange={(e) => setValue(e.target.value)} />

            <button onClick={() => createM.mutate()}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2 shadow-lg shadow-emerald-500/25 transition-all duration-200">
              <span className="inline-flex items-center justify-center gap-2">
                <IconSparkles width={18} height={18} />
                Add
              </span>
            </button>
          </div>
        </Card>

        <Card title="Recent logs">
          {listQ.isLoading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : listQ.isError ? (
            <div className="text-sm text-red-300">Failed to load habits.</div>
          ) : (listQ.data?.data?.items || []).length === 0 ? (
            <div className="text-sm text-slate-400">No logs yet. Add one above.</div>
          ) : (
            <div className="space-y-2">
              {(listQ.data?.data?.items || []).map((h) => (
                <div key={h._id} className="flex items-center justify-between gap-3 text-sm border-b border-slate-800 pb-2">
                  <div className="min-w-0">
                    <div className="text-slate-300 truncate">{h.type} — {h.value}</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${methodBadgeClass(h.calculationMethod)}`}>
                        {methodLabel(h.calculationMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400 whitespace-nowrap">{Number(h.emissionKg || 0).toFixed?.(2) ?? h.emissionKg} kg</div>
                </div>
              ))}
            </div>
          )}

          {!listQ.isLoading && !listQ.isError && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Page {listQ.data?.meta?.page ?? page} / {listQ.data?.meta?.pages ?? 1} · Total {listQ.data?.meta?.total ?? 0}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50"
                  disabled={page >= (listQ.data?.meta?.pages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
