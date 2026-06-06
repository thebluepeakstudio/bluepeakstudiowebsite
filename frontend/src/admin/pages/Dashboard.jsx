import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { getDashboard } from "../api/analytics.api";
import { getLeadMetrics } from "../api/leads.api";
import LeadMetricsCards from "../components/leads/LeadMetricsCards";
import { StatCard } from "../components/ui/Card";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { getProjectLabel } from "../utils/constants";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [leadMetrics, setLeadMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((dashRes) => setData(dashRes.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    getLeadMetrics()
      .then((leadRes) => setLeadMetrics(leadRes.data.data))
      .catch(console.error)
      .finally(() => setLeadsLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards = data?.cards || {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Projects" value={cards.activeProjects} icon={FolderKanban} />
        <StatCard title="Completed" value={cards.completedProjects} icon={CheckCircle} />
        <StatCard title="Pending Payments" value={formatCurrency(cards.pendingPayments)} icon={Clock} />
        <StatCard title="Partial Payments" value={cards.partialPaymentProjects ?? 0} icon={AlertTriangle} />
        <StatCard title="Total Revenue" value={formatCurrency(cards.totalRevenue)} icon={IndianRupee} />
        <StatCard title="Total Expenses" value={formatCurrency(cards.totalExpenses)} icon={TrendingDown} />
        <StatCard title="Net Profit" value={formatCurrency(cards.netProfit)} icon={TrendingUp} />
        <StatCard title="Freelancers" value={cards.totalFreelancers} icon={Users} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-admin-text">Lead pipeline</h2>
          <Link to="/admin-panel/leads" className="text-sm text-admin-primary hover:underline">
            Manage leads
          </Link>
        </div>
        {leadsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <LeadMetricsCards metrics={leadMetrics} />
        )}
      </div>

      <Card
        title="Latest Projects"
        action={
          <Link to="/admin-panel/projects" className="text-sm text-admin-primary hover:underline">
            View all
          </Link>
        }
      >
        <Table
          columns={[
            { key: "client", label: "Client", render: (r) => getProjectLabel(r) },
            { key: "projectType", label: "Type", render: (r) => r.projectType },
            { key: "workStatus", label: "Status", render: (r) => <Badge status={r.workStatus} /> },
            { key: "paymentStatus", label: "Payment", render: (r) => <Badge status={r.paymentStatus} /> },
          ]}
          data={data?.latestProjects || []}
          onRowClick={(r) => (window.location.href = `/admin-panel/projects/${r._id}`)}
        />
      </Card>
    </div>
  );
}
