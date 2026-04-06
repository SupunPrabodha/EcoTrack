import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { IconBox, IconLightbulb, IconRefresh, IconSave, IconSparkles, IconTrash, IconWarning } from "../components/Icons";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateOnly(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoRangeFromDates(fromDate, toDate) {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Recommendations() {
  const now = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return dateOnly(d);
  });
  const [toDate, setToDate] = useState(() => dateOnly(now));

  const range = useMemo(() => isoRangeFromDates(fromDate, toDate), [fromDate, toDate]);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [impact, setImpact] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;
  const [savedMsg, setSavedMsg] = useState(null);
  const [whyOpen, setWhyOpen] = useState(() => new Set());
  const [savedWhyOpen, setSavedWhyOpen] = useState(() => new Set());

  const recQ = useQuery({
    queryKey: ["recommendations", range],
    queryFn: async () =>
      (await api.get("/recommendations/generate", { params: range })).data.data,
  });

  const savedQ = useQuery({
    queryKey: ["recommendations-saved", page, search, impact],
    queryFn: async () =>
      (await api.get("/recommendations", { params: { page, limit, ...(search ? { search } : {}), ...(impact ? { impact } : {}) } })).data,
  });

  const saveM = useMutation({
    mutationFn: async (tip) =>
      api.post("/recommendations", {
        title: tip.title,
        body: tip.body,
        impact: tip.impact,
        context: {
          weather: recQ.data?.weather || undefined,
          range,
        },
        evidence: {
          why: tip.why || undefined,
          habits: recQ.data?.evidence?.habits || undefined,
          weather: recQ.data?.weather || undefined,
          range,
        },
      }),
    onSuccess: () => {
      setSavedMsg("Saved.");
      qc.invalidateQueries({ queryKey: ["recommendations-saved"] });
      setTimeout(() => setSavedMsg(null), 1500);
    },
  });

  const fromLabel = useMemo(() => {
    try {
      return new Date(range.from).toLocaleDateString();
    } catch {
      return fromDate;
    }
  }, [range.from, fromDate]);

  const toLabel = useMemo(() => {
    try {
      return new Date(range.to).toLocaleDateString();
    } catch {
      return toDate;
    }
  }, [range.to, toDate]);

  const deleteM = useMutation({
    mutationFn: async (id) => api.delete(`/recommendations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations-saved"] }),
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            <span className="inline-flex items-center gap-2">
              <IconLightbulb width={24} height={24} />
              <span>Smart Recommendations</span>
            </span>
          </div>
          <div className="text-slate-400 text-sm">AI-powered sustainability tips based on your behavior</div>
        </div>

        <Card title="Date range (drives your tips)">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">From</div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">To</div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-sm py-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                onClick={() => recQ.refetch()}
                disabled={recQ.isFetching}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {recQ.isFetching ? <IconRefresh width={18} height={18} className="animate-spin" /> : <IconSparkles width={18} height={18} />}
                  <span>{recQ.isFetching ? "Generating…" : "Regenerate"}</span>
                </span>
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Tips are based on your logged habits in this range, plus optional weather context.
          </div>
        </Card>

        {savedMsg && (
          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 text-emerald-200 px-4 py-3 text-sm">
            {savedMsg}
          </div>
        )}

        {recQ.isLoading && (
          <div className="text-sm text-slate-400 inline-flex items-center gap-2">
            <IconRefresh width={16} height={16} className="animate-spin" />
            <span>Loading recommendations…</span>
          </div>
        )}

        {recQ.isError && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 text-red-200 px-4 py-3 text-sm">
            Failed to load recommendations.
          </div>
        )}

        {!recQ.isLoading && recQ.data?.weather && (
          <Card title="Weather Context">
            <div>
              {recQ.data.weather.city} — {recQ.data.weather.tempC}°C
            </div>
            <div className="text-sm text-slate-400">
              Condition: {recQ.data.weather.condition}
            </div>
          </Card>
        )}

        {!recQ.isLoading && !recQ.data?.weather && (
          <div className="text-xs text-slate-500">
            Weather context is unavailable (OpenWeather key missing or request failed). Tips still work.
          </div>
        )}

        {!recQ.isLoading && (recQ.data?.tips || []).length === 0 && (
          <div className="text-sm text-slate-400">No tips available right now.</div>
        )}

        {!recQ.isLoading && recQ.data?.tips?.map((tip, i) => (
          <Card key={i} title={tip.title}>
            <div className="text-slate-300">{tip.body}</div>

            {Array.isArray(tip.why) && tip.why.length > 0 && (
              <div className="mt-3">
                <button
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
                  onClick={() => {
                    setWhyOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                >
                  {whyOpen.has(i) ? "Hide why" : "Why this tip?"}
                </button>

                {whyOpen.has(i) && (
                  <div className="mt-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-xs text-slate-300 space-y-1">
                    {tip.why.map((line, idx) => (
                      <div key={idx}>• {line}</div>
                    ))}
                    <div className="pt-1 text-slate-500">
                      Range: {fromLabel} → {toLabel}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">Impact: {tip.impact}</div>
              <button
                onClick={() => saveM.mutate(tip)}
                disabled={saveM.isPending}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <IconSave width={16} height={16} />
                  <span>Save</span>
                </span>
              </button>
            </div>
          </Card>
        ))}

        <div className="pt-2">
          <div className="text-xl font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            <span className="inline-flex items-center gap-2">
              <IconBox width={20} height={20} />
              <span>Saved Recommendations</span>
            </span>
          </div>
          <div className="text-sm text-slate-400">CRUD + pagination/search filters.</div>
        </div>

        <Card title="Filters">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title/body…"
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />

            <select
              value={impact}
              onChange={(e) => {
                setImpact(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            >
              <option value="">All impacts</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Positive">Positive</option>
            </select>

            <button
              className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm py-2 transition-all"
              onClick={() => {
                setSearch("");
                setImpact("");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </Card>

        {savedQ.isLoading ? (
          <div className="text-sm text-slate-400">Loading saved…</div>
        ) : savedQ.isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm shadow-lg shadow-red-500/10">
            <span className="inline-flex items-center gap-2">
              <IconWarning width={18} height={18} />
              <span>Failed to load saved recommendations.</span>
            </span>
          </div>
        ) : (savedQ.data?.data?.items || []).length === 0 ? (
          <div className="text-sm text-slate-400">No saved recommendations yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {(savedQ.data?.data?.items || []).map((r) => (
              <Card key={r._id} title={r.title}>
                <div className="text-slate-300">{r.body}</div>

                {(r?.context?.range?.from || r?.context?.weather?.condition) && (
                  <div className="mt-3 text-xs text-slate-500">
                    {r?.context?.range?.from && r?.context?.range?.to ? (
                      <span>
                        Range: {new Date(r.context.range.from).toLocaleDateString()} → {new Date(r.context.range.to).toLocaleDateString()}
                      </span>
                    ) : null}
                    {r?.context?.weather?.condition ? (
                      <span>
                        {(r?.context?.range?.from && r?.context?.range?.to) ? " · " : ""}
                        Weather: {r.context.weather.condition}{typeof r.context.weather.tempC === "number" ? `, ${r.context.weather.tempC}°C` : ""}{r.context.weather.city ? ` (${r.context.weather.city})` : ""}
                      </span>
                    ) : null}
                  </div>
                )}

                {Array.isArray(r?.evidence?.why) && r.evidence.why.length > 0 && (
                  <div className="mt-3">
                    <button
                      className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
                      onClick={() => {
                        setSavedWhyOpen((prev) => {
                          const next = new Set(prev);
                          if (next.has(r._id)) next.delete(r._id);
                          else next.add(r._id);
                          return next;
                        });
                      }}
                    >
                      {savedWhyOpen.has(r._id) ? "Hide why" : "Why was this suggested?"}
                    </button>

                    {savedWhyOpen.has(r._id) && (
                      <div className="mt-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-xs text-slate-300 space-y-1">
                        {r.evidence.why.map((line, idx) => (
                          <div key={idx}>• {line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">Impact: {r.impact || "—"}</div>
                  <button
                    onClick={() => deleteM.mutate(r._id)}
                    disabled={deleteM.isPending}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-700/50 text-red-100 text-sm transition-all disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconTrash width={16} height={16} />
                      <span>Delete</span>
                    </span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!savedQ.isLoading && !savedQ.isError && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page {savedQ.data?.meta?.page ?? page} / {savedQ.data?.meta?.pages ?? 1} · Total {savedQ.data?.meta?.total ?? 0}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all disabled:opacity-50"
                disabled={page >= (savedQ.data?.meta?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
