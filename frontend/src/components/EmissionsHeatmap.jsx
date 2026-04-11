import React, { useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import Card from "./Card";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTodayEndISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function EmissionsHeatmap() {
  // Fetch all emission trends for the past year
  const from = getDateNDaysAgo(364).toISOString();
  const to = getTodayEndISO();
  const trendsQ = useQuery({
    queryKey: ["trends", { from, to }],
    queryFn: async () => (await api.get("/emissions/trends", { params: { from, to } })).data.data,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[EmissionsHeatmap] Raw API data:", trendsQ.data);
  }, [trendsQ.data]);

  // Prepare data for heatmap
  const values = useMemo(() => {
    if (!Array.isArray(trendsQ.data)) return [];
    // Normalize date to YYYY-MM-DD (in case backend returns with time or different format)
    return trendsQ.data.map((d) => {
      let date = d._id;
      // If date contains time, extract only the date part
      if (typeof date === "string" && date.length > 10) date = date.slice(0, 10);
      // If date is not in YYYY-MM-DD, try to convert
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const dt = new Date(date);
        if (!isNaN(dt)) {
          date = dt.toISOString().slice(0, 10);
        }
      }
      return {
        date,
        count: Number(d.totalKg ?? 0),
      };
    });
  }, [trendsQ.data]);

  React.useEffect(() => {
    if (Array.isArray(values)) {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const found = values.find((v) => v.date === todayStr);
      // eslint-disable-next-line no-console
      console.log("[EmissionsHeatmap] Today's value:", found, "All values:", values);
    }
  }, [values]);

  // Color scale (GitHub style)
  function classForValue(value) {
    if (!value || value.count === 0) return "color-empty";
    if (value.count < 1) return "color-scale-1";
    if (value.count < 5) return "color-scale-2";
    if (value.count < 10) return "color-scale-3";
    if (value.count < 20) return "color-scale-4";
    return "color-scale-5";
  }

  return (
    <Card title="Emissions Heatmap (Calendar)">
      <div className="overflow-x-auto">
        <CalendarHeatmap
          startDate={getDateNDaysAgo(364)}
          endDate={new Date()}
          values={values}
          classForValue={classForValue}
          showWeekdayLabels={true}
          tooltipDataAttrs={value => ({
            'data-tip': value.date ? `${value.date}: ${value.count} kg CO₂` : "No data"
          })}
        />
      </div>
      <style>{`
        .react-calendar-heatmap .color-empty { fill: #ffffff46 !important; }
        .color-scale-1 { fill: #bbf7d0; }
        .color-scale-2 { fill: #6ee7b7; }
        .color-scale-3 { fill: #34d399; }
        .color-scale-4 { fill: #10b981; }
        .color-scale-5 { fill: #047857; }
      `}</style>
    </Card>
  );
}
