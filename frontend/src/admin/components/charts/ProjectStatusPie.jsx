import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartContainer from "./ChartContainer";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

export default function ProjectStatusPie({ data }) {
  const chartData = (data || []).map((d) => ({
    name: d._id,
    value: d.count,
  }));

  if (!chartData.length) {
    return <p className="py-12 text-center text-sm text-admin-textMuted">No project data</p>;
  }

  return (
    <ChartContainer>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
    </ChartContainer>
  );
}
