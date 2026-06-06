import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../utils/formatCurrency";
import ChartContainer from "./ChartContainer";

export default function ServiceRevenueBar({ data }) {
  const chartData = (data || []).map((d) => ({
    name: d._id,
    revenue: d.revenue,
  }));

  return (
    <ChartContainer className="h-[260px] sm:h-[320px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v) => formatCurrency(v)} />
        <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartContainer>
  );
}
