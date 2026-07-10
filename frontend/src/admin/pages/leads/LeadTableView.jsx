import { useNavigate } from "react-router-dom";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import LeadStatusBadge from "../../components/leads/LeadStatusBadge";
import Badge from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { adminPath } from "../../utils/adminPaths";

export default function LeadTableView({
  list,
  pagination,
  loading,
  selected,
  onToggle,
  onToggleAll,
  onPageChange,
}) {
  const navigate = useNavigate();
  const allSelected = list.length > 0 && list.every((l) => selected.has(l._id));

  return (
    <>
      <Table
        mobileTitleKey="fullName"
        onRowClick={(r) => navigate(adminPath("leads", r._id))}
        columns={[
          {
            key: "select",
            label: (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleAll(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ),
            render: (r) => (
              <input
                type="checkbox"
                checked={selected.has(r._id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggle(r._id);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          },
          { key: "fullName", label: "Name" },
          { key: "companyName", label: "Company" },
          { key: "status", label: "Stage", render: (r) => <LeadStatusBadge status={r.status} /> },
          { key: "priority", label: "Priority", render: (r) => <Badge status={r.priority}>{r.priority}</Badge> },
          {
            key: "estimatedProjectValue",
            label: "Value",
            render: (r) => formatCurrency(r.estimatedProjectValue),
          },
          {
            key: "assignedTo",
            label: "Assigned",
            render: (r) => r.assignedTo?.name || "—",
          },
          {
            key: "nextFollowUpDate",
            label: "Follow-up",
            render: (r) => formatDate(r.nextFollowUpDate),
          },
        ]}
        data={list}
        emptyMessage={loading ? "Loading..." : "No leads found"}
      />
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={onPageChange} />
    </>
  );
}
