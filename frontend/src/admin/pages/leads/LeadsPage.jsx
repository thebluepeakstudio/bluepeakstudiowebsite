import { useEffect, useState } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
import {
  getLeads,
  getKanban,
  getLeadMetrics,
  createLead,
  updateLead,
  deleteLead,
  bulkLeads,
  updateLeadStatus,
} from "../../api/leads.api";
import { getAdmins } from "../../api/auth.api";
import { useDebounce } from "../../hooks/useDebounce";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import { TableSkeleton } from "../../components/ui/Skeleton";
import LeadMetricsCards from "../../components/leads/LeadMetricsCards";
import LeadFilters from "../../components/leads/LeadFilters";
import LeadBulkActionsBar from "../../components/leads/LeadBulkActionsBar";
import LeadTableView from "./LeadTableView";
import LeadKanbanView from "./LeadKanbanView";
import LeadFormModal, { emptyLead } from "./LeadFormModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast from "react-hot-toast";

export default function LeadsPage() {
  const [view, setView] = useState("table");
  const [list, setList] = useState([]);
  const [kanban, setKanban] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [admins, setAdmins] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLead);
  const [submitting, setSubmitting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    leadSource: sourceFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
  };

  const fetchTable = (page = 1) => {
    setLoading(true);
    getLeads({ page, limit: 10, ...filters })
      .then(({ data }) => {
        setList(data.data);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  const fetchKanban = () => {
    setLoading(true);
    getKanban(filters)
      .then(({ data }) => setKanban(data.data))
      .finally(() => setLoading(false));
  };

  const refresh = () => {
    getLeadMetrics().then(({ data }) => setMetrics(data.data));
    if (view === "table") fetchTable(pagination.page);
    else fetchKanban();
  };

  useEffect(() => {
    getAdmins().then(({ data }) => setAdmins(data.data)).catch(() => {});
    getLeadMetrics().then(({ data }) => setMetrics(data.data));
  }, []);

  useEffect(() => {
    if (view === "table") fetchTable(1);
    else fetchKanban();
    setSelected(new Set());
  }, [view, debouncedSearch, statusFilter, sourceFilter, priorityFilter, assignedFilter]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateLead(editing._id, payload);
        toast.success("Lead updated");
      } else {
        await createLead(payload);
        toast.success("Lead added");
      }
      setModalOpen(false);
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKanbanStatus = async (id, status) => {
    try {
      await updateLeadStatus(id, { status });
      fetchKanban();
      getLeadMetrics().then(({ data }) => setMetrics(data.data));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update stage");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(list.map((l) => l._id)) : new Set());
  };

  const runBulk = async (action, payload) => {
    setSubmitting(true);
    try {
      await bulkLeads({ action, ids: [...selected], payload });
      toast.success("Bulk action completed");
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <LeadMetricsCards metrics={metrics} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          <div className="w-full min-w-[12rem] sm:max-w-xs">
            <SearchInput value={search} onChange={setSearch} placeholder="Search leads..." />
          </div>
          <LeadFilters
            status={statusFilter}
            onStatusChange={setStatusFilter}
            source={sourceFilter}
            onSourceChange={setSourceFilter}
            priority={priorityFilter}
            onPriorityChange={setPriorityFilter}
            assignedTo={assignedFilter}
            onAssignedChange={setAssignedFilter}
            admins={admins}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-admin-border p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded px-2 py-1.5 ${view === "table" ? "bg-admin-primary text-white" : "text-admin-textMuted"}`}
              aria-label="Table view"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`rounded px-2 py-1.5 ${view === "kanban" ? "bg-admin-primary text-white" : "text-admin-textMuted"}`}
              aria-label="Kanban view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditing(null);
              setForm(emptyLead);
              setModalOpen(true);
            }}
          >
            <Plus size={18} /> Add Lead
          </Button>
        </div>
      </div>

      <LeadBulkActionsBar
        selectedCount={selected.size}
        admins={admins}
        loading={submitting}
        onDelete={() => setBulkDeleteOpen(true)}
        onStatus={(status) => runBulk("updateStatus", { status })}
        onAssign={(assignedTo) => runBulk("assign", { assignedTo })}
        onPriority={(priority) => runBulk("setPriority", { priority })}
      />

      {loading ? (
        <TableSkeleton />
      ) : view === "table" ? (
        <LeadTableView
          list={list}
          pagination={pagination}
          loading={loading}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          onPageChange={fetchTable}
        />
      ) : (
        <LeadKanbanView grouped={kanban} onStatusChange={handleKanbanStatus} />
      )}

      <LeadFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={submitting}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={async () => {
          await runBulk("delete");
          setBulkDeleteOpen(false);
        }}
        title="Delete selected leads?"
        message="This cannot be undone."
      />
    </div>
  );
}
