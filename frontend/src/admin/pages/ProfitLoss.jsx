import { useQuery } from "@tanstack/react-query";
import { getPL } from "../api/analytics.api";
import { adminQueryKeys } from "../queryKeys";
import { StatCard } from "../components/ui/Card";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../utils/formatCurrency";

export default function ProfitLoss() {
  const { data, isLoading: loading } = useQuery({
    queryKey: adminQueryKeys.profitLoss(),
    queryFn: async () => {
      const { data: res } = await getPL();
      return res.data;
    },
    staleTime: 30_000,
  });

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
        Pending payments are the total client balance still owed across all projects (project value minus received payments).
        Net profit = revenue − expenses − freelancer costs.
      </p>
    </div>
  );
}
