import { StatCard } from "../ui/Card";
import { Target, Sparkles, CheckCircle, XCircle, TrendingUp, IndianRupee } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

export default function LeadMetricsCards({ metrics }) {
  if (!metrics) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Leads" value={metrics.totalLeads} icon={Target} />
      <StatCard title="New" value={metrics.newLeads} icon={Sparkles} />
      <StatCard title="Qualified" value={metrics.qualifiedLeads} icon={CheckCircle} />
      <StatCard title="Won" value={metrics.wonLeads} icon={CheckCircle} />
      <StatCard title="Lost" value={metrics.lostLeads} icon={XCircle} />
      <StatCard title="Conversion Rate" value={`${metrics.conversionRate}%`} icon={TrendingUp} />
      <StatCard title="Pipeline Value" value={formatCurrency(metrics.pipelineValue)} icon={IndianRupee} />
    </div>
  );
}
