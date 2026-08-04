import { StatCard } from "../ui/Card";
import { Target, Sparkles, MessageSquare, CheckCircle, XCircle, TrendingUp, IndianRupee } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

export default function LeadMetricsCards({ metrics }) {
  if (!metrics) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Leads" value={metrics.totalLeads} icon={Target} accent="blue" />
      <StatCard title="New" value={metrics.newLeads} icon={Sparkles} accent="blue" />
      <StatCard
        title="Contacted"
        value={metrics.contactedLeads ?? metrics.qualifiedLeads}
        icon={MessageSquare}
        accent="amber"
      />
      <StatCard title="Won" value={metrics.wonLeads} icon={CheckCircle} accent="emerald" />
      <StatCard title="Lost" value={metrics.lostLeads} icon={XCircle} accent="rose" />
      <StatCard title="Conversion Rate" value={`${metrics.conversionRate}%`} icon={TrendingUp} accent="amber" />
      <StatCard title="Pipeline Value" value={formatCurrency(metrics.pipelineValue)} icon={IndianRupee} accent="blue" />
    </div>
  );
}
