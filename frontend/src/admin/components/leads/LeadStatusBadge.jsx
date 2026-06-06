import Badge from "../ui/Badge";

export default function LeadStatusBadge({ status }) {
  return <Badge status={status}>{status}</Badge>;
}
