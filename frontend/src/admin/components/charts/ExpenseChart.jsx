import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../utils/formatCurrency";
import ChartContainer from "./ChartContainer";

export default function ExpenseChart({ data }) {
  return (
    <ChartContainer>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} width={48} />
        <Tooltip formatter={(v) => formatCurrency(v)} />
        <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartContainer>
  );
}
