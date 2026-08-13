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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(data?.totalRevenue)} />
        <StatCard title="Total Expenses" value={formatCurrency(data?.totalExpenses)} />
        <StatCard title="Total Decree Expenses" value={formatCurrency(data?.totalDecree)} />
        <StatCard title="Freelancer Costs" value={formatCurrency(data?.freelancerCosts)} />
        <StatCard title="Gross Profit" value={formatCurrency(data?.grossProfit)} />
        <StatCard title="Net Profit" value={formatCurrency(data?.netProfit)} />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data?.clientOutstanding ?? data?.pendingPayments)}
        />
      </div>
      <p className="text-sm text-admin-textMuted">
        Total revenue is the sum of booked project values (deliverable selling prices for one-time
        projects, cash received to date for recurring). Outstanding is the total client balance still
        owed across all projects. Total Decree Expenses is the sum of all expenses marked under the Decree category. Gross profit = revenue − freelancer costs. Net profit = revenue −
        expenses − freelancer costs.
      </p>
    </div>
  );
}
