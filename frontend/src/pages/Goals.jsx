import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import Stat from "../components/Stat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { IconCalendar, IconEdit, IconFlame, IconLeaf, IconSave, IconTarget, IconTrash, IconWarning } from "../components/Icons";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(start, end) {
  if (!start || !end) return "—";
  return `${formatDate(start)} 
  – ${formatDate(end)}`;
}

function getDailyRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function getWeeklyRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function getMonthlyRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function GoalOverviewRow({ period, label }) {
  const goalsQ = useQuery({
    queryKey: ["goals", "overview", period],
    queryFn: async () =>
      (
        await api.get("/goals", {
          params: { page: 1, limit: 10, status: "active", period },
        })
      ).data.data,
  });

  const items = goalsQ.data?.items || [];
  const currentGoal = items.find((g) => g.period === period) || null;

  const evalQ = useQuery({
    queryKey: ["goal-evaluate", period, currentGoal?._id],
    enabled: !!currentGoal?._id,
    queryFn: async () => (await api.post(`/goals/${currentGoal._id}/evaluate`)).data.data,
  });

  const progressData = evalQ.data?.progress;
  const currentKg = progressData?.currentKg ?? null;
  const maxKg = progressData?.maxKg ?? null;
  const progressPct = currentKg !== null && maxKg ? (currentKg / maxKg) * 100 : 0;
  const status = progressData?.status;

  return (
    <div className="space-y-2 text-xs sm:text-sm">
      <div className="flex items-center justify-between text-slate-300">
        <span className="font-medium">{label}</span>
        <span className="text-slate-400">
          {currentKg !== null ? (currentKg.toFixed?.(2) ?? currentKg) : "—"} kg /{" "}
          {maxKg !== null ? maxKg : "—"} kg
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${progressPct <= 100 ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Status:{" "}
          <span
            className={
              status === "active" || status === "achieved" ? "text-emerald-400" : "text-red-400"
            }
          >
            {evalQ.isLoading ? "…" : status || "none"}
          </span>
        </span>
        {!currentGoal && <span>No active goal</span>}
      </div>
    </div>
  );
}

function GoalSection({
  period,
  title,
  target,
  setTarget,
  alertsEnabled,
  setAlertsEnabled,
  alertEmail,
  setAlertEmail,
}) {
  const qc = useQueryClient();

  const range = useMemo(() => {
    if (period === "daily") return getDailyRange();
    if (period === "monthly") return getMonthlyRange();
    return getWeeklyRange();
  }, [period]);

  const goalsQ = useQuery({
    queryKey: ["goals", period],
    queryFn: async () =>
      (
        await api.get("/goals", {
          params: { page: 1, limit: 10, status: "active", period },
        })
      ).data.data,
  });

  const items = goalsQ.data?.items || [];
  const currentGoal = items.find((g) => g.period === period) || null;

  const evalQ = useQuery({
    queryKey: ["goal-evaluate", period, currentGoal?._id],
    enabled: !!currentGoal?._id,
    queryFn: async () => (await api.post(`/goals/${currentGoal._id}/evaluate`)).data.data,
  });

  const createM = useMutation({
    mutationFn: async () =>
      api.post("/goals", {
        title,
        period,
        maxKg: Number(target),
        startDate: range.startDate,
        endDate: range.endDate,
        alertsEnabled,
        ...(alertsEnabled && alertEmail ? { alertEmail } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const updateTargetM = useMutation({
    mutationFn: async (newMaxKg) =>
      api.put(`/goals/${currentGoal?._id}`, {
        maxKg: newMaxKg,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goal-evaluate"] });
    },
  });


  const deleteM = useMutation({
    mutationFn: async () => api.delete(`/goals/${currentGoal._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goal-evaluate"] });
    },
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTargetValue, setEditTargetValue] = useState("");
  const progressData = evalQ.data?.progress;
  const currentKg = progressData?.currentKg ?? null;
  const maxKg = progressData?.maxKg ?? null;
  const progressPct = currentKg !== null && maxKg ? (currentKg / maxKg) * 100 : 0;
  const status = progressData?.status;

  return (
    <div className="space-y-4">
      {(goalsQ.isError || evalQ.isError) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-3 text-xs shadow-lg shadow-red-500/10">
          <span className="inline-flex items-center gap-2">
            <IconWarning width={14} height={14} />
            Failed to load {period} goal. Please try again.
          </span>
        </div>
      )}

      <Card title={`${title} (kg)`}>
      <div className="grid grid-cols-[auto_auto] gap-4 items-center">
          <input
            type="number"
          className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            onClick={() => createM.mutate()}
            disabled={createM.isPending}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"
          >
            <span className="inline-flex items-center gap-2">
              <IconSave width={18} height={18} />
              {createM.isPending ? "Saving..." : `Set ${period} Target`}
            </span>
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
            />
            Enable email alerts 
          </label>

          <input
            placeholder="Alert email (optional)"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            disabled={!alertsEnabled}
            className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm disabled:opacity-50 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        {createM.isError && (
          <div className="mt-3 text-sm text-red-300">
            {createM.error?.response?.data?.message || "Failed to create goal"}
          </div>
        )}
      </Card>

      <Card title={`${title} Progress`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400 flex items-center gap-2 flex-wrap">
              <span>
                Total: {currentKg !== null ? currentKg.toFixed?.(2) ?? currentKg : "—"} kg /
              </span>

              {!isEditingTarget ? (
                <span className="inline-flex items-center gap-1">
                  <span>Target: {maxKg !== null ? maxKg : "—"} kg</span>
                  {currentGoal && (
                    <button
                      type="button"
                      onClick={() => {
                        const initial =
                          (currentGoal && typeof currentGoal.maxKg === "number"
                            ? currentGoal.maxKg
                            : maxKg) ?? 0;
                        setEditTargetValue(initial ? String(initial) : "");
                        setIsEditingTarget(true);
                      }}
                      className="ml-1 text-[11px] text-slate-500 hover:text-emerald-300 transition-colors"
                    >
                      <IconEdit width={13} height={13} />
                    </button>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span>Target:</span>
                  <input
                    type="number"
                    className="w-20 bg-slate-900/70 border border-emerald-500/40 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={editTargetValue}
                    onChange={(e) => {
                      setEditTargetValue(e.target.value);
                      setTarget(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setIsEditingTarget(false);
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number(editTargetValue);
                      if (!Number.isNaN(parsed) && currentGoal) {
                        updateTargetM.mutate(parsed);
                      }
                      setIsEditingTarget(false);
                    }}
                  />
                  <span className="text-xs text-slate-400">kg</span>
                </span>
              )}
            </div>

            {currentGoal && (
              <button
                type="button"
                onClick={() => deleteM.mutate()}
                disabled={deleteM.isPending}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-300 hover:bg-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconTrash width={13} height={13} />
                <span>{deleteM.isPending ? "Removing…" : "Remove goal"}</span>
              </button>
            )}
          </div>

          <div className="w-full bg-slate-800 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${
                progressPct <= 100 ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>

          <div className="text-sm">
            Status:{" "}
            <span
              className={
                status === "active" || status === "achieved" ? "text-emerald-400" : "text-red-400"
              }
            >
              {evalQ.isLoading ? "…" : status}
            </span>
          </div>

          {!currentGoal && (
            <div className="text-xs text-slate-500">
              No active {period} goal found. Create one above to track progress.
            </div>
          )}

          {currentGoal && evalQ.isLoading && (
            <div className="text-xs text-slate-500">Calculating progress…</div>
          )}

          {currentGoal && !evalQ.isLoading && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm">
              <div className="text-slate-300">
                Alert status: {evalQ.data?.alert?.sent ? "sent" : "not sent"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Provider: {evalQ.data?.alert?.provider || "—"} · Reason: {evalQ.data?.alert?.reason || "—"}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function CompletedGoalsList() {
  const completedQ = useQuery({
    queryKey: ["goals", "completed"],
    queryFn: async () =>
      (
        await api.get("/goals", {
          params: { page: 1, limit: 20 },
        })
      ).data.data,
  });

  const items = (completedQ.data?.items || []).filter(
    (g) => g.status === "achieved" || g.status === "failed"
  );

  return (
    <div className="space-y-2 text-xs sm:text-sm">
      <div className="flex items-center justify-between">
        {completedQ.isLoading && <span className="text-slate-500">Loading…</span>}
      </div>

      {!completedQ.isLoading && items.length === 0 && (
        <div className="text-slate-500">No completed goals yet.</div>
      )}

      {items.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {items.map((goal) => (
            <li
              key={goal._id}
              className="flex items-center justify-between rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-slate-200 text-xs sm:text-sm truncate max-w-[10rem] sm:max-w-[14rem]">
                  {goal.title}
                </span>
                <span className="text-[11px] text-slate-500">
                  Target ≤ {goal.maxKg} kg · {goal.period}
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatDateRange(goal.startDate, goal.endDate)}
                </span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border  ${
                  goal.status === "achieved"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/10 text-red-300 border-red-500/30"
                }`}
              >
                {goal.status === "achieved" ? "Achieved" : "Failed"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Goals() {
  const [period, setPeriod] = useState("daily");

  const [formState, setFormState] = useState({
    daily: { target: 20, alertsEnabled: false, alertEmail: "" },
    weekly: { target: 20, alertsEnabled: false, alertEmail: "" },
    monthly: { target: 20, alertsEnabled: false, alertEmail: "" },
  });

  const periodConfig = {
    daily: {
      title: "Daily CO₂ Target",
    },
    weekly: {
      title: "Weekly CO₂ Target",
    },
    monthly: {
      title: "Monthly CO₂ Target",
    },
  };

  const active = periodConfig[period];
  const activeForm = formState[period];

  const usageSummaryQ = useQuery({
    queryKey: ["goals-usage-external-summary"],
    queryFn: async () => (await api.get("/goals/usage/external-summary")).data.data,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-300">
                <IconTarget width={22} height={22} />
              </span>
              Goals & Accountability
            </span>
          </div>
          <div className="text-slate-400 text-sm">Set targets and track your progress</div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <Stat
            label="Yesterday CO₂ per person"
            value={
              usageSummaryQ.isLoading
                ? "\u2026"
                : `${Number(usageSummaryQ.data?.yesterday?.totalKg ?? 0).toFixed(2)} kg`
            }
            sub={
              <span className="inline-flex items-center gap-2">
                <IconCalendar width={16} height={16} />
                <span className="text-xs text-slate-400">World Bank global CO₂ per-capita data</span>
              </span>
            }
          />

          <Stat
            label="Last 7 days CO₂ per person"
            value={
              usageSummaryQ.isLoading
                ? "\u2026"
                : `${Number(usageSummaryQ.data?.last7Days?.totalKg ?? 0).toFixed(2)} kg`
            }
            sub={
              <span className="inline-flex items-center gap-2">
                <IconLeaf width={16} height={16} />
                <span className="text-xs text-slate-400">Global average, not your personal footprint</span>
              </span>
            }
          />

          <Stat
            label="Last month CO₂ per person"
            value={
              usageSummaryQ.isLoading
                ? "\u2026"
                : `${Number(usageSummaryQ.data?.lastMonth?.totalKg ?? 0).toFixed(2)} kg`
            }
            sub={
              <span className="inline-flex items-center gap-2">
                <IconFlame width={16} height={16} />
                <span className="text-xs text-slate-400">Approximate month from yearly per-capita data</span>
              </span>
            }
          />
        </div>

        <div className="inline-flex rounded-full bg-slate-900/70 border border-slate-800 p-1 text-xs sm:text-sm">
          {["daily", "weekly", "monthly"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full transition-all ${
                period === p
                  ? "bg-emerald-500 text-slate-900 shadow shadow-emerald-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {p === "daily" && "Daily"}
              {p === "weekly" && "Weekly"}
              {p === "monthly" && "Monthly"}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 items-start">
          <GoalSection
            period={period}
            title={active.title}
            target={activeForm.target}
            setTarget={(value) =>
              setFormState((prev) => ({
                ...prev,
                [period]: { ...prev[period], target: value },
              }))
            }
            alertsEnabled={activeForm.alertsEnabled}
            setAlertsEnabled={(value) =>
              setFormState((prev) => ({
                ...prev,
                [period]: { ...prev[period], alertsEnabled: value },
              }))
            }
            alertEmail={activeForm.alertEmail}
            setAlertEmail={(value) =>
              setFormState((prev) => ({
                ...prev,
                [period]: { ...prev[period], alertEmail: value },
              }))
            }
          />
          <Card title="All Goals Overview">
            <div className="space-y-4">
              <GoalOverviewRow period="daily" label="Daily" />
              <GoalOverviewRow period="weekly" label="Weekly" />
              <GoalOverviewRow period="monthly" label="Monthly" />
            </div>
          </Card>
        </div>

        <Card title="Completed goals">
          <CompletedGoalsList />
        </Card>
      </div>
    </div>
  );
}
