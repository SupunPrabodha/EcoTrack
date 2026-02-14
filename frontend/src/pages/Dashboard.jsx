import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function isoRange7Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  from.setHours(0,0,0,0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Dashboard() {
  const range = useMemo(() => isoRange7Days(), []);

  const summaryQ = useQuery({
    queryKey: ["summary", range],
    queryFn: async () => (await api.get("/emissions/summary", { params: range })).data.data
  });

  const trendsQ = useQuery({
    queryKey: ["trends", range],
    queryFn: async () => (await api.get("/emissions/trends", { params: range })).data.data
  });

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-5">
        <div className="text-2xl font-semibold">Dashboard</div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Total emissions (last 7 days)">
            <div className="text-3xl font-bold">
              {summaryQ.data ? `${summaryQ.data.totalKg} kg` : "—"}
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Logged entries: {summaryQ.data?.entries ?? "—"}
            </div>
          </Card>

          <Card title="Status">
            <div className="text-sm text-slate-300">
              Keep logging habits daily to get smarter tips and goal tracking.
            </div>
          </Card>

          <Card title="Quick tip">
            <div className="text-sm text-slate-300">
              Small changes done consistently beat “one-day hero” behavior.
            </div>
          </Card>
        </div>

        <Card title="Trend (kg CO2e per day)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(trendsQ.data || []).map(d => ({ date: d._id, kg: Number(d.totalKg.toFixed?.(2) ?? d.totalKg) }))}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="kg" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
