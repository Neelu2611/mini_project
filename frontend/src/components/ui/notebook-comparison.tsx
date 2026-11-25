"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import evaluation from "@/lib/notebook-evaluation.json";

const chartNames: Record<number, string> = {
  185: "Balanced XGB", 179: "Unweighted XGB", 142: "XGB + SMOTENC",
  114: "Tuned RF + SMOTENC", 100: "LR + SMOTENC",
};
const chartData = [185, 179, 142, 114, 100].map((cell) => ({
  ...evaluation.comparisons.find((item) => item.cell === cell),
  name: chartNames[cell],
}));

export function NotebookComparison() {
  return (
    <div className="insights-chart" aria-hidden="true" data-testid="historical-comparison-chart">
      <ResponsiveContainer width="100%" height={265}>
        <BarChart layout="vertical" data={chartData} accessibilityLayer={false} margin={{ top: 8, right: 24, bottom: 3, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="#dce5eb" />
          <XAxis type="number" domain={[0, 1]} ticks={[0, .25, .5, .75, 1]} tickFormatter={(value) => `${value * 100}%`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11, fill: "#142a40" }} />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="recall" name="Class 2 recall" fill="#08736a" maxBarSize={13} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          <Bar dataKey="f1" name="Class 2 F1" fill="#32709e" maxBarSize={13} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
