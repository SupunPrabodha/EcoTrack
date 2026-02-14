import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

function isoRange30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  from.setHours(0,0,0,0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Habits() {
  const qc = useQueryClient();
  const range = useMemo(() => isoRange30Days(), []);
  const [type, setType] = useState("car_km");
  const [value, setValue] = useState(5);

  const listQ = useQuery({
    queryKey: ["habits", range],
    queryFn: async () => (await api.get("/habits", { params: { ...range, page: 1, limit: 10 } })).data.data
  });

  const createM = useMutation({
    mutationFn: async () => api.post("/habits", { type, value: Number(value), date: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] })
  });

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4">
        <div className="text-2xl font-semibold">Habits</div>

        <Card title="Log a habit (today)">
          <div className="grid md:grid-cols-3 gap-3">
            <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
              value={type} onChange={(e) => setType(e.target.value)}>
              <option value="car_km">Car travel (km)</option>
              <option value="public_transport_km">Public transport (km)</option>
              <option value="electricity_kwh">Electricity (kWh)</option>
              <option value="meat_meals">Meat meals</option>
              <option value="plastic_items">Plastic items</option>
            </select>

            <input type="number" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
              value={value} onChange={(e) => setValue(e.target.value)} />

            <button onClick={() => createM.mutate()}
              className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 font-semibold py-2">
              Add
            </button>
          </div>
        </Card>

        <Card title="Recent logs">
          <div className="space-y-2">
            {(listQ.data?.items || []).map((h) => (
              <div key={h._id} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                <div className="text-slate-300">{h.type} — {h.value}</div>
                <div className="text-slate-400">{h.emissionKg} kg</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
