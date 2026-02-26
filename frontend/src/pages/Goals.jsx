import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { IconSave, IconTarget, IconWarning } from "../components/Icons";

function getWeeklyRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function Goals() {
  const qc = useQueryClient();
  const [target, setTarget] = useState(20);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const week = useMemo(() => getWeeklyRange(), []);

  const goalsQ = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals", { params: { page: 1, limit: 10, status: "active" } })).data.data,
  });

  const currentGoal = goalsQ.data?.items?.[0] || null;

  const evalQ = useQuery({
    queryKey: ["goal-evaluate", currentGoal?._id],
    enabled: !!currentGoal?._id,
    queryFn: async () => (await api.post(`/goals/${currentGoal._id}/evaluate`)).data.data,
  });

  const createM = useMutation({
    mutationFn: async () =>
      api.post("/goals", {
        title: "Weekly CO2 Target",
        maxKg: Number(target),
        startDate: week.startDate,
        endDate: week.endDate,
        alertsEnabled,
        ...(alertsEnabled && alertEmail ? { alertEmail } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries(["goals"]);
    },
  });

  const progressData = evalQ.data?.progress;
  const currentKg = progressData?.currentKg ?? null;
  const maxKg = progressData?.maxKg ?? null;
  const progressPct = currentKg !== null && maxKg ? (currentKg / maxKg) * 100 : 0;
  const status = progressData?.status;

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

        {(goalsQ.isError || evalQ.isError) && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm shadow-lg shadow-red-500/10">
            <span className="inline-flex items-center gap-2">
              <IconWarning width={18} height={18} />
              Failed to load goal data. Please try again.
            </span>
          </div>
        )}

        <Card title="Set Weekly CO2 Target (kg)">
          <div className="flex gap-4">
            <input
              type="number"
              className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <button
              onClick={() => createM.mutate()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"
            >
              <span className="inline-flex items-center gap-2">
                <IconSave width={18} height={18} />
                Save Target
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
              Enable email alerts (requires Brevo/SendGrid configured)
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

        <Card title="Weekly Progress">
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              Total: {currentKg !== null ? currentKg.toFixed?.(2) ?? currentKg : "—"} kg /
              Target: {maxKg !== null ? maxKg : "—"} kg
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
                No active goal found. Create one above to track progress.
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
    </div>
  );
}
