import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { IconDocument, IconEdit, IconRefresh, IconSave, IconSparkles, IconTrash, IconWarning } from "../components/Icons";

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

const HABIT_TYPES = [
  { value: "car_km", label: "Car travel (km)" },
  { value: "public_transport_km", label: "Public transport (km)" },
  { value: "electricity_kwh", label: "Electricity (kWh)" },
  { value: "meat_meals", label: "Meat meals" },
  { value: "plastic_items", label: "Plastic items" },
];

function methodLabel(m) {
  if (m === "carbon_interface") return "Carbon Interface";
  if (m === "grid_intensity") return "Grid Intensity";
  if (m === "local_factor") return "Local factor";
  if (m === "invalid_input") return "Invalid input";
  if (m === "unknown_type") return "Unknown";
  return m || "—";
}

function methodBadgeClass(m) {
  if (m === "carbon_interface") return "border-emerald-900 bg-emerald-950/30 text-emerald-200";
  if (m === "grid_intensity") return "border-sky-900 bg-sky-950/30 text-sky-200";
  if (m === "local_factor") return "border-slate-800 bg-slate-950/40 text-slate-200";
  return "border-slate-800 bg-slate-950/40 text-slate-300";
}

export default function Emissions() {
  const qc = useQueryClient();
  const now = useMemo(() => new Date(), []);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return dateOnly(d);
  });
  const [toDate, setToDate] = useState(() => dateOnly(now));

  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const range = useMemo(() => isoRangeFromDates(fromDate, toDate), [fromDate, toDate]);

  const listQ = useQuery({
    queryKey: ["manual-emissions", range, page, filterType, search],
    queryFn: async () =>
      (
        await api.get("/emissions", {
          params: {
            ...range,
            page,
            limit,
            sourceType: "manual",
            ...(filterType ? { habitType: filterType } : {}),
            ...(search ? { search } : {}),
          },
        })
      ).data,
  });

  const [mode, setMode] = useState("computed"); // computed | direct
  const [habitType, setHabitType] = useState("electricity_kwh");
  const [value, setValue] = useState(5);
  const [emissionKg, setEmissionKg] = useState("");
  const [date, setDate] = useState(() => dateOnly(new Date()));
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ habitType: "", value: "", emissionKg: "", date: "", region: "", notes: "" });

  const createM = useMutation({
    mutationFn: async () => {
      const payload = {
        sourceType: "manual",
        date: new Date(date).toISOString(),
        ...(region ? { region } : {}),
        ...(notes ? { notes } : {}),
      };

      if (mode === "direct") {
        return api.post("/emissions", {
          ...payload,
          emissionKg: Number(emissionKg),
        });
      }

      return api.post("/emissions", {
        ...payload,
        habitType,
        value: Number(value),
      });
    },
    onSuccess: () => {
      setPage(1);
      qc.invalidateQueries({ queryKey: ["manual-emissions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
      setNotes("");
      setRegion("");
      if (mode === "direct") setEmissionKg("");
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id) => api.delete(`/emissions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual-emissions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      const patch = {};
      if (edit.habitType) patch.habitType = edit.habitType;
      if (edit.value !== "" && edit.value !== null && edit.value !== undefined) patch.value = Number(edit.value);
      if (edit.emissionKg !== "" && edit.emissionKg !== null && edit.emissionKg !== undefined) patch.emissionKg = Number(edit.emissionKg);
      if (edit.date) patch.date = new Date(edit.date).toISOString();
      if (edit.region !== undefined) patch.region = edit.region;
      if (edit.notes !== undefined) patch.notes = edit.notes;
      return api.put(`/emissions/${editingId}`, patch);
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["manual-emissions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      qc.invalidateQueries({ queryKey: ["recent-emissions"] });
    },
  });

  const startEdit = (e) => {
    setEditingId(e._id);
    setEdit({
      habitType: e.habitType || "",
      value: typeof e.value === "number" ? String(e.value) : "",
      emissionKg: typeof e.emissionKg === "number" ? String(e.emissionKg) : "",
      date: e.date ? dateOnly(new Date(e.date)) : "",
      region: e.region || "",
      notes: e.notes || "",
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-5">
        <div>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            <span className="inline-flex items-center gap-2">
              <IconDocument width={24} height={24} />
              <span>Manual Emissions</span>
            </span>
          </div>
          <div className="text-slate-400 text-sm">Track and manage custom emission entries</div>
        </div>

        <Card title="Filters">
          <div className="grid md:grid-cols-5 gap-3">
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
                {HABIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Search notes</div>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. electricity"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
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
                  setSearch("");
                  setPage(1);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </Card>

        <Card title="Create a manual emission entry">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Mode</div>
              <select
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="computed">Compute via APIs/factors</option>
                <option value="direct">Enter kg directly</option>
              </select>
            </div>

            {mode === "computed" ? (
              <>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Habit type</div>
                  <select
                    className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={habitType}
                    onChange={(e) => setHabitType(e.target.value)}
                  >
                    {HABIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Value</div>
                  <input
                    type="number"
                    className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <div className="text-xs text-slate-400 mb-1">Emission (kg CO2e)</div>
                <input
                  type="number"
                  className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={emissionKg}
                  onChange={(e) => setEmissionKg(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mt-3 grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Region (optional)</div>
              <input
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. LK"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Notes (optional)</div>
              <input
                className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="short description"
              />
            </div>
          </div>

          {createM.isError && (
            <div className="mt-3 text-sm text-red-300">
              {createM.error?.response?.data?.message || "Failed to create entry"}
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={() => createM.mutate()}
              disabled={createM.isPending || (mode === "direct" && emissionKg === "")}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2 px-5 shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {createM.isPending ? <IconRefresh width={18} height={18} className="animate-spin" /> : <IconSparkles width={18} height={18} />}
                <span>{createM.isPending ? "Saving…" : "Create"}</span>
              </span>
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            When using “Compute”, the backend will try Carbon Interface / Grid Intensity first, then fall back to local factors.
          </div>
        </Card>

        <Card title="Manual entries">
          {listQ.isLoading ? (
            <div className="text-sm text-slate-400 inline-flex items-center gap-2">
              <IconRefresh width={16} height={16} className="animate-spin" />
              <span>Loading…</span>
            </div>
          ) : listQ.isError ? (
            <div className="text-sm text-red-300 inline-flex items-center gap-2">
              <IconWarning width={16} height={16} />
              <span>Failed to load entries.</span>
            </div>
          ) : (listQ.data?.data?.items || []).length === 0 ? (
            <div className="text-sm text-slate-400">No manual entries yet.</div>
          ) : (
            <div className="space-y-3">
              {(listQ.data?.data?.items || []).map((e) => (
                <div key={e._id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate">
                        {e.habitType ? `Type: ${e.habitType}` : "Manual emission"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(e.date).toLocaleString()} {e.region ? ` · Region: ${e.region}` : ""}
                      </div>
                      {e.notes ? <div className="text-xs text-slate-400 mt-2">{e.notes}</div> : null}
                      <div className="mt-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${methodBadgeClass(e.calculationMethod)}`}>
                          {methodLabel(e.calculationMethod)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-200 font-semibold whitespace-nowrap">
                        {Number(e.emissionKg || 0).toFixed?.(2) ?? e.emissionKg} kg
                      </div>
                      <div className="mt-2 flex gap-2 justify-end">
                        <button
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all"
                          onClick={() => startEdit(e)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <IconEdit width={16} height={16} />
                            <span>Edit</span>
                          </span>
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-700/50 text-red-100 text-sm transition-all disabled:opacity-50"
                          disabled={deleteM.isPending}
                          onClick={() => deleteM.mutate(e._id)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <IconTrash width={16} height={16} />
                            <span>Delete</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {editingId === e._id && (
                    <div className="mt-3 border-t border-slate-800 pt-3 grid gap-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Habit type (optional)</div>
                          <select
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.habitType}
                            onChange={(ev) => setEdit((p) => ({ ...p, habitType: ev.target.value }))}
                          >
                            <option value="">—</option>
                            {HABIT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Value (optional)</div>
                          <input
                            type="number"
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.value}
                            onChange={(ev) => setEdit((p) => ({ ...p, value: ev.target.value }))}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Emission kg (optional)</div>
                          <input
                            type="number"
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.emissionKg}
                            onChange={(ev) => setEdit((p) => ({ ...p, emissionKg: ev.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Date</div>
                          <input
                            type="date"
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.date}
                            onChange={(ev) => setEdit((p) => ({ ...p, date: ev.target.value }))}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Region</div>
                          <input
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.region}
                            onChange={(ev) => setEdit((p) => ({ ...p, region: ev.target.value }))}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Notes</div>
                          <input
                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-3 py-2 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={edit.notes}
                            onChange={(ev) => setEdit((p) => ({ ...p, notes: ev.target.value }))}
                          />
                        </div>
                      </div>

                      {updateM.isError && (
                        <div className="text-sm text-red-300">
                          {updateM.error?.response?.data?.message || "Failed to update"}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                          disabled={updateM.isPending}
                          onClick={() => updateM.mutate()}
                        >
                          <span className="inline-flex items-center gap-2">
                            {updateM.isPending ? <IconRefresh width={16} height={16} className="animate-spin" /> : <IconSave width={16} height={16} />}
                            <span>{updateM.isPending ? "Saving…" : "Save changes"}</span>
                          </span>
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="text-xs text-slate-500">
                        If you change type/value/region and leave emissionKg blank, the backend recomputes using third‑party APIs when available.
                      </div>
                    </div>
                  )}
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
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-sm transition-all disabled:opacity-50"
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
