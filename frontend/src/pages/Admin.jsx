import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { api } from "../api/client";
import { IconShield, IconWarning } from "../components/Icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function startOfDayIso(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayIso(dateStr) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

export default function Admin() {
  const qc = useQueryClient();
  const [range, setRange] = useState(() => defaultRange());
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const params = useMemo(
    () => ({ from: startOfDayIso(range.from), to: endOfDayIso(range.to) }),
    [range]
  );

  const usersParams = useMemo(
    () => ({ page: userPage, limit: 10, ...(userSearch ? { search: userSearch } : {}) }),
    [userPage, userSearch]
  );

  const emissionsQ = useQuery({
    queryKey: ["admin-emissions-analytics", params],
    queryFn: async () => (await api.get("/admin/analytics/emissions", { params })).data.data,
  });

  const goalsQ = useQuery({
    queryKey: ["admin-goals-analytics", params],
    queryFn: async () => (await api.get("/admin/analytics/goals", { params })).data.data,
  });

  const leaderboardQ = useQuery({
    queryKey: ["admin-leaderboard", params],
    queryFn: async () =>
      (await api.get("/admin/leaderboard/emissions", { params: { ...params, limit: 10, direction: "asc" } }))
        .data.data,
  });

  const usersQ = useQuery({
    queryKey: ["admin-users", usersParams],
    queryFn: async () => (await api.get("/admin/users", { params: usersParams })).data.data,
  });

  const setRoleM = useMutation({
    mutationFn: async ({ id, role }) => (await api.patch(`/admin/users/${id}/role`, { role })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const error = emissionsQ.isError || goalsQ.isError || leaderboardQ.isError || usersQ.isError;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-300">
                  <IconShield width={22} height={22} />
                </span>
                Admin Analytics
              </span>
            </div>
            <div className="text-sm text-slate-400">Global analytics and leaderboard (RBAC demo).</div>
          </div>

          <div className="flex gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">From</div>
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">To</div>
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm text-red-200 px-5 py-4 text-sm shadow-lg shadow-red-500/10">
            <span className="inline-flex items-center gap-2">
              <IconWarning width={18} height={18} />
              Failed to load admin analytics. Ensure you are logged in as an admin.
            </span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Global emissions">
            <div className="text-3xl font-bold tracking-tight">
              {emissionsQ.isLoading ? "…" : `${Number(emissionsQ.data?.totalKg || 0).toFixed?.(2) ?? 0} kg`}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Users: {emissionsQ.data?.users ?? "—"} · Entries: {emissionsQ.data?.entries ?? "—"}
            </div>
          </Card>

          <Card title="Goal performance">
            <div className="text-sm text-slate-300">
              Active: {goalsQ.data?.byStatus?.active ?? 0}
              <br />
              Achieved: {goalsQ.data?.byStatus?.achieved ?? 0}
              <br />
              Failed: {goalsQ.data?.byStatus?.failed ?? 0}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Alerts enabled: {goalsQ.data?.alerts?.enabled ?? 0} · disabled: {goalsQ.data?.alerts?.disabled ?? 0}
            </div>
          </Card>

          <Card title="Targets">
            <div className="text-sm text-slate-300">
              Avg target: {Number(goalsQ.data?.targetStats?.avgMaxKg || 0).toFixed?.(2) ?? 0} kg
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Min: {goalsQ.data?.targetStats?.minMaxKg ?? 0} · Max: {goalsQ.data?.targetStats?.maxMaxKg ?? 0}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Emissions by type (kg)">
            {emissionsQ.isLoading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : (emissionsQ.data?.byType || []).length === 0 ? (
              <div className="text-sm text-slate-400">No data for this range yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(emissionsQ.data?.byType || []).map((r) => ({
                      type: r._id || "unknown",
                      kg: Number(r.totalKg || 0),
                      entries: Number(r.entries || 0),
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="type" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    <Bar dataKey="kg" name="kg" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Goals by status">
            {goalsQ.isLoading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(goalsQ.data?.byStatus || {}).map(([status, count]) => ({
                      status,
                      count: Number(count || 0),
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="status" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="goals" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card title="Emissions leaderboard (lowest first)">
          {leaderboardQ.isLoading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : (leaderboardQ.data?.items || []).length === 0 ? (
            <div className="text-sm text-slate-400">No data for this range yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Entries</th>
                    <th className="py-2">Total (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboardQ.data?.items || []).map((r) => (
                    <tr key={r.userId} className="border-b border-slate-900">
                      <td className="py-2 pr-3 text-slate-200">
                        {r.user?.email || r.user?.name || r.userId}
                      </td>
                      <td className="py-2 pr-3 text-slate-300">{r.entries}</td>
                      <td className="py-2 text-slate-300">
                        {Number(r.totalKg || 0).toFixed?.(2) ?? r.totalKg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="User management (RBAC demo)">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div className="text-sm text-slate-400">
              Promote/demote users. (You cannot change your own role.)
            </div>
            <div className="flex gap-2">
              <input
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search name/email"
                className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm w-64 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {usersQ.isLoading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : (usersQ.data?.items || []).length === 0 ? (
            <div className="text-sm text-slate-400">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data?.items || []).map((u) => (
                    <tr key={u._id} className="border-b border-slate-900">
                      <td className="py-2 pr-3 text-slate-200">{u.name || "—"}</td>
                      <td className="py-2 pr-3 text-slate-300">{u.email}</td>
                      <td className="py-2 pr-3 text-slate-300">{u.role}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={u.role}
                            className="bg-slate-900/50 border border-emerald-500/20 rounded-xl px-2 py-2 text-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            onChange={(e) => {
                              const role = e.target.value;
                              if (role && role !== u.role) {
                                setRoleM.mutate({ id: u._id, role });
                              }
                            }}
                            disabled={setRoleM.isPending}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          {setRoleM.isPending && <span className="text-xs text-slate-500">Saving…</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="text-slate-500">
              Page {usersQ.data?.page ?? userPage} of {usersQ.data?.pages ?? 1}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 px-3 py-2 text-sm transition-all disabled:opacity-50"
                disabled={(usersQ.data?.page ?? userPage) <= 1 || usersQ.isLoading}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 px-3 py-2 text-sm transition-all disabled:opacity-50"
                disabled={(usersQ.data?.page ?? userPage) >= (usersQ.data?.pages ?? 1) || usersQ.isLoading}
                onClick={() => setUserPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
