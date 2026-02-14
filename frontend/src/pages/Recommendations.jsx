import { useMemo } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function getWeeklyRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return { from: start.toISOString(), to: now.toISOString() };
}

export default function Recommendations() {
  const range = useMemo(() => getWeeklyRange(), []);

  const recQ = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () =>
      (await api.get("/recommendations", { params: range })).data.data,
  });

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="text-2xl font-semibold">
          Smart Recommendations
        </div>

        {recQ.data?.weather && (
          <Card title="Weather Context">
            <div>
              {recQ.data.weather.city} — {recQ.data.weather.tempC}°C
            </div>
            <div className="text-sm text-slate-400">
              Condition: {recQ.data.weather.condition}
            </div>
          </Card>
        )}

        {recQ.data?.tips?.map((tip, i) => (
          <Card key={i} title={tip.title}>
            <div className="text-slate-300">{tip.body}</div>
            <div className="text-xs mt-2 text-slate-500">
              Impact Level: {tip.impact}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
