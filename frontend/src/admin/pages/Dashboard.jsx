import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import PageHeader, { PageSection, LinkAction } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/Card";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { getProjectLabel } from "../utils/constants";

export default function Dashboard() {
  const navigate = useNavigate();
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
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of projects, revenue, and lead activity."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const cards = data?.cards || {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of projects, revenue, expenses, and lead pipeline at a glance."
      />

      <PageSection title="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Projects" value={cards.activeProjects} icon={FolderKanban} accent="blue" />
          <StatCard title="Completed" value={cards.completedProjects} icon={CheckCircle} accent="emerald" />
          <StatCard title="Pending Payments" value={formatCurrency(cards.pendingPayments)} icon={Clock} accent="amber" />
          <StatCard title="Partial Payments" value={cards.partialPaymentProjects ?? 0} icon={AlertTriangle} accent="amber" />
          <StatCard title="Total Revenue" value={formatCurrency(cards.totalRevenue)} icon={IndianRupee} accent="emerald" />
          <StatCard title="Total Expenses" value={formatCurrency(cards.totalExpenses)} icon={TrendingDown} accent="rose" />
          <StatCard title="Net Profit" value={formatCurrency(cards.netProfit)} icon={TrendingUp} accent="blue" />
          <StatCard title="Freelancers" value={cards.totalFreelancers} icon={Users} accent="blue" />
        </div>
      </PageSection>

      <PageSection
        title="Lead pipeline"
        description="Track new leads, follow-ups, and conversions."
        action={<LinkAction to="/admin-panel/leads">Manage leads</LinkAction>}
      >
        {leadsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <LeadMetricsCards metrics={leadMetrics} />
        )}
      </PageSection>

      <Card
        title="Latest Projects"
        subtitle="Recently onboarded or updated projects"
        action={<LinkAction to="/admin-panel/projects">View all</LinkAction>}
      >
        <Table
          columns={[
            { key: "client", label: "Client", render: (r) => getProjectLabel(r) },
            { key: "projectType", label: "Type", render: (r) => r.projectType },
            { key: "workStatus", label: "Status", render: (r) => <Badge status={r.workStatus} /> },
            { key: "paymentStatus", label: "Payment", render: (r) => <Badge status={r.paymentStatus} /> },
          ]}
          data={data?.latestProjects || []}
          onRowClick={(r) => navigate(`/admin-panel/projects/${r._id}`)}
          emptyMessage="No projects yet"
        />
      </Card>
    </div>
  );
}
