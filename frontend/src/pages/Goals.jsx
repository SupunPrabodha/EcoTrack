import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

function getWeeklyRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: now.toISOString() };
}

export default function Goals() {
  const qc = useQueryClient();
  const [target, setTarget] = useState(20);
  const range = useMemo(() => getWeeklyRange(), []);

  const progressQ = useQuery({
    queryKey: ["goal-progress"],
    queryFn: async () =>
      (await api.get("/goals/progress", {
        params: { period: "weekly", ...range },
      })).data.data,
  });

  const createM = useMutation({
    mutationFn: async () =>
      api.post("/goals", { period: "weekly", targetKg: Number(target) }),
    onSuccess: () => qc.invalidateQueries(["goal-progress"]),
  });

  const progress = progressQ.data?.progressPct || 0;
  const status = progressQ.data?.status;

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="text-2xl font-semibold">Goals & Accountability</div>

        <Card title="Set Weekly CO2 Target (kg)">
          <div className="flex gap-4">
            <input
              type="number"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <button
              onClick={() => createM.mutate()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold"
            >
              Save Target
            </button>
          </div>
        </Card>

        <Card title="Weekly Progress">
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              Total: {progressQ.data?.totalKg ?? "—"} kg /
              Target: {progressQ.data?.targetKg ?? "—"} kg
            </div>

            <div className="w-full bg-slate-800 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  progress <= 100 ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="text-sm">
              Status:{" "}
              <span
                className={
                  status === "on_track"
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {status}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
