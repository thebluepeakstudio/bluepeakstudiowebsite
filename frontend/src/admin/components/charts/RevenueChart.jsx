import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/formatCurrency";
import ChartContainer from "./ChartContainer";

export default function RevenueChart({ data }) {
  return (
    <ChartContainer>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => `₹${v / 1000}k`} />
        <Tooltip formatter={(v) => formatCurrency(v)} />
        <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
    </ChartContainer>
  );
}
