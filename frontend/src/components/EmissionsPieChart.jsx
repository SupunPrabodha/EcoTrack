import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Default color palette for categories
const COLORS = [
  "#10b981", "#06b6d4", "#f59e42", "#f43f5e", "#6366f1", "#fbbf24", "#a3e635", "#f472b6", "#38bdf8", "#f87171"
];

/**
 * EmissionsPieChart
 * @param {Object[]} data - Array of { type, kg, count }
 * @param {string} [title] - Optional chart title
 */
export default function EmissionsPieChart({ data, title }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="text-sm text-slate-400">No category data to display.</div>;
  }

  // Pie expects a value key
  const chartData = data.map((d) => ({ name: d.type, value: d.kg }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="w-full h-80">
      {title && <div className="mb-2 text-base font-semibold text-slate-200">{title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, idx) => (
              <Cell key={`cell-${entry.name}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(2)} kg`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-slate-400">Total: {total.toFixed(2)} kg CO₂e</div>
    </div>
  );
}
