import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/formatCurrency";
import ChartContainer from "./ChartContainer";

export default function ProfitChart({ data }) {
  return (
    <ChartContainer>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} width={48} />
        <Tooltip formatter={(v) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expenses" stroke="#94a3b8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="freelancerCosts" stroke="#f59e0b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
    </ChartContainer>
  );
}
