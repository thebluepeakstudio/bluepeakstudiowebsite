import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Clock,
  IndianRupee,
  TrendingUp,
  Bell,
  CalendarClock,
  Wallet,
} from "lucide-react";
import { getDashboard } from "../api/analytics.api";
import { adminQueryKeys } from "../queryKeys";
import PageHeader, { LinkAction } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/Card";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import ServicesPillList from "../components/projects/ServicesPillList";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency, formatDate } from "../utils/formatCurrency";
import { getProjectLabel } from "../utils/constants";
import { adminPath } from "../utils/adminPaths";

function AlertList({ items, empty, onItemClick, renderPrimary, renderSecondary, renderMeta }) {
  if (!items?.length) {
    return <p className="text-sm text-admin-textMuted">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-admin-border/60">
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full items-start justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-admin-muted/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-admin-text">{renderPrimary(item)}</p>
              {renderSecondary?.(item) && (
                <p className="mt-0.5 truncate text-xs text-admin-textMuted">{renderSecondary(item)}</p>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-admin-textMuted">{renderMeta(item)}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading: loading } = useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: async () => {
      const dashRes = await getDashboard();
      return dashRes.data.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const cards = data?.cards || {};
  const alerts = data?.alerts || {};
  const followUpsToday = alerts.followUpsToday || [];
  const paymentsDue = alerts.paymentsDue || [];
  const followUpCount = followUpsToday.length;
  const hasAlerts = followUpCount > 0 || paymentsDue.length > 0;

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
        title="Needs attention"
        subtitle={
          hasAlerts
            ? `${followUpCount} follow-up${followUpCount === 1 ? "" : "s"} · ${paymentsDue.length} payment${paymentsDue.length === 1 ? "" : "s"} due`
            : "Nothing urgent right now"
        }
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">
            <Bell size={13} />
            Today
          </span>
        }
      >
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-28 animate-pulse rounded-xl bg-admin-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-admin-muted" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-admin-text">
                <CalendarClock size={16} className="text-amber-600" />
                Follow up today
              </div>
              <AlertList
                items={followUpsToday}
                empty="No lead follow-ups scheduled for today."
                onItemClick={(item) => navigate(adminPath("leads", item._id))}
                renderPrimary={(item) => item.fullName || "—"}
                renderSecondary={(item) =>
                  [item.companyName, item.reminderNotes].filter(Boolean).join(" · ") || null
                }
                renderMeta={(item) => <p>{formatDate(item.nextFollowUpDate)}</p>}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-admin-text">
                <Wallet size={16} className="text-emerald-600" />
                Recurring payments due
              </div>
              <AlertList
                items={paymentsDue}
                empty="No recurring payments due for collection."
                onItemClick={(item) =>
                  item.serviceId && navigate(adminPath("projects", item.serviceId))
                }
                renderPrimary={(item) => item.clientName || "—"}
                renderSecondary={(item) =>
                  [item.businessName, item.projectName].filter(Boolean).join(" · ") || null
                }
                renderMeta={(item) => (
                  <>
                    <p className="font-semibold text-admin-text">{formatCurrency(item.amountDue)}</p>
                    <p className="mt-0.5">{formatDate(item.dueDate)}</p>
                    <div className="mt-1 flex justify-end">
                      <Badge status={item.status} />
                    </div>
                  </>
                )}
              />
            </div>
          </div>
        )}
      </Card>

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
              {
                key: "paymentStatus",
                label: "Payment",
                render: (r) => <Badge status={r.paymentStatus} />,
              },
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

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
