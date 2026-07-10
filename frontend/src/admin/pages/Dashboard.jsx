import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Clock, IndianRupee, TrendingUp } from "lucide-react";
import { getDashboard } from "../api/analytics.api";
import { adminQueryKeys } from "../queryKeys";
import PageHeader, { LinkAction } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/Card";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import ServicesPillList from "../components/projects/ServicesPillList";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { getProjectLabel } from "../utils/constants";
import { adminPath } from "../utils/adminPaths";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading: loading } = useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: async () => {
      const dashRes = await getDashboard();
      return dashRes.data.data;
    },
    staleTime: 30_000,
  });

  const cards = data?.cards || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A quick snapshot of projects and finances."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Projects"
            value={cards.activeProjects ?? 0}
            icon={FolderKanban}
            accent="blue"
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(cards.clientOutstanding ?? cards.pendingPayments)}
            icon={Clock}
            accent="amber"
          />
          <StatCard
            title="Received This Month"
            value={formatCurrency(cards.paymentsReceivedThisMonth ?? 0)}
            icon={IndianRupee}
            accent="emerald"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(cards.netProfit)}
            icon={TrendingUp}
            accent="blue"
          />
        </div>
      )}

      <Card
        title="Latest Projects"
        subtitle="Recently added projects"
        action={<LinkAction to={adminPath("projects")}>View all</LinkAction>}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-admin-muted" />
            ))}
          </div>
        ) : (
          <Table
            columns={[
              { key: "client", label: "Client", render: (r) => r.clientName || "—" },
              { key: "project", label: "Project", render: (r) => getProjectLabel(r) },
              {
                key: "services",
                label: "Services",
                render: (r) => (
                  <ServicesPillList services={r.services} servicesCount={r.servicesCount} />
                ),
              },
              { key: "workStatus", label: "Status", render: (r) => <Badge status={r.workStatus} /> },
              { key: "paymentStatus", label: "Payment", render: (r) => <Badge status={r.paymentStatus} /> },
            ]}
            data={data?.latestProjects || []}
            onRowClick={(r) => navigate(adminPath("projects", r._id))}
            emptyMessage="No projects yet"
          />
        )}
      </Card>
    </div>
  );
}
