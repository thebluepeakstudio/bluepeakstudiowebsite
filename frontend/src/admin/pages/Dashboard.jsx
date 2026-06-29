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
  Layers,
  Wallet,
} from "lucide-react";
import { getDashboard } from "../api/analytics.api";
import { getLeadMetrics } from "../api/leads.api";
import LeadMetricsCards from "../components/leads/LeadMetricsCards";
import PageHeader, { PageSection, LinkAction } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/Card";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import ServicesPillList from "../components/projects/ServicesPillList";
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

  const cards = data?.cards || {};
  const deliverables = cards.deliverables || {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of projects, deliverables, payments, and lead pipeline."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <PageSection title="Projects">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Active Projects" value={cards.activeProjects} icon={FolderKanban} accent="blue" />
              <StatCard title="Completed" value={cards.completedProjects} icon={CheckCircle} accent="emerald" />
              <StatCard
                title="Waiting For Client"
                value={cards.waitingForClientProjects ?? 0}
                icon={Clock}
                accent="purple"
              />
            </div>
          </PageSection>

          <PageSection title="Deliverables">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="In Progress" value={deliverables.inProgress ?? 0} icon={Layers} accent="blue" />
              <StatCard title="Review" value={deliverables.review ?? 0} icon={AlertTriangle} accent="amber" />
              <StatCard title="Delivered" value={deliverables.delivered ?? 0} icon={CheckCircle} accent="emerald" />
              <StatCard title="Delayed" value={deliverables.delayed ?? 0} icon={Clock} accent="rose" />
            </div>
          </PageSection>

          <PageSection title="Payments">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Outstanding"
                value={formatCurrency(cards.pendingPayments)}
                icon={Clock}
                accent="amber"
              />
              <StatCard
                title="Received This Month"
                value={formatCurrency(cards.paymentsReceivedThisMonth ?? 0)}
                icon={IndianRupee}
                accent="emerald"
              />
              <StatCard title="Partial Payments" value={cards.partialPaymentProjects ?? 0} icon={Wallet} accent="amber" />
            </div>
          </PageSection>

          <PageSection title="Freelancers">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Pending Payments"
                value={formatCurrency(cards.freelancerPendingPayments ?? 0)}
                icon={Users}
                accent="amber"
              />
              <StatCard
                title="Paid This Month"
                value={formatCurrency(cards.freelancerPaidThisMonth ?? 0)}
                icon={Wallet}
                accent="emerald"
              />
              <StatCard title="Total Freelancers" value={cards.totalFreelancers} icon={Users} accent="blue" />
            </div>
          </PageSection>

          <PageSection title="Profit">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Revenue" value={formatCurrency(cards.totalRevenue)} icon={IndianRupee} accent="emerald" />
              <StatCard
                title="Expenses"
                value={formatCurrency(cards.totalExpenses)}
                icon={TrendingDown}
                accent="rose"
              />
              <StatCard title="Net Profit" value={formatCurrency(cards.netProfit)} icon={TrendingUp} accent="blue" />
            </div>
          </PageSection>
        </>
      )}

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
            onRowClick={(r) => navigate(`/admin-panel/projects/${r._id}`)}
            emptyMessage="No projects yet"
          />
        )}
      </Card>
    </div>
  );
}
