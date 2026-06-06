import { useEffect, useState } from "react";
import { getPL } from "../api/analytics.api";
import { StatCard } from "../components/ui/Card";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../utils/formatCurrency";

export default function ProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPL()
      .then(({ data: res }) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Revenue" value={formatCurrency(data?.totalRevenue)} />
        <StatCard title="Total Expenses" value={formatCurrency(data?.totalExpenses)} />
        <StatCard title="Freelancer Costs" value={formatCurrency(data?.freelancerCosts)} />
        <StatCard title="Gross Profit" value={formatCurrency(data?.grossProfit)} />
        <StatCard title="Net Profit" value={formatCurrency(data?.netProfit)} />
        <StatCard title="Pending Payments" value={formatCurrency(data?.pendingPayments)} />
      </div>
      <p className="text-sm text-admin-textMuted">
        Freelancer costs are the total outsourcing cost on outsourced projects. Net profit = revenue − expenses − freelancer costs.
      </p>
    </div>
  );
}
