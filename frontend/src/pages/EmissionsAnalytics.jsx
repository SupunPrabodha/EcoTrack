import EmissionsPieChart from "../components/EmissionsPieChart";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import EmissionsLineChart from "../components/EmissionsLineChart";
import EmissionsHeatmap from "../components/EmissionsHeatmap";

export default function EmissionsAnalytics() {
  // Fetch summary breakdown (same as Dashboard)
  const summaryQ = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/emissions/summary")).data.data,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Prepare breakdown data for the pie chart
  const breakdown = Array.isArray(summaryQ.data?.byType)
    ? summaryQ.data.byType.filter((r) => r && r._id).map((r) => ({ type: r._id, kg: Number(r.totalKg ?? 0), count: Number(r.count ?? 0) }))
    : [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Emissions by Category (Pie Chart)">
            <EmissionsPieChart data={breakdown} title="Emissions by Category" />
          </Card>
          <EmissionsLineChart />
        </div>
        <div className="mt-8">
          <EmissionsHeatmap />
        </div>
      </div>
    </div>
  );
}
