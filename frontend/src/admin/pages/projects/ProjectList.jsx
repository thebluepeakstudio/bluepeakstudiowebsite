import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, Repeat } from "lucide-react";
import { getProjects, createProjectWithDeliverables, createService, updateProject, deleteProject } from "../../api/services.api";
import { useDebounce } from "../../hooks/useDebounce";
import { usePaginatedQuery } from "../../hooks/usePaginatedQuery";
import { adminQueryKeys } from "../../queryKeys";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import FilterSelect from "../../components/ui/FilterSelect";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import ServicesPillList from "../../components/projects/ServicesPillList";
import Pagination from "../../components/ui/Pagination";
import { adminPath } from "../../utils/adminPaths";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageToolbar } from "../../components/layout/PageHeader";
import ProjectWizard from "./ProjectWizard";
import RecurringProjectWizard from "./RecurringProjectWizard";
import ProjectEditForm from "./ProjectEditForm";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { WORK_STATUSES, PAYMENT_STATUSES, SERVICE_CATEGORIES, BILLING_MODEL_FILTER_OPTIONS, getProjectLabel, normalizePaymentStatus } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

export default function ProjectList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get("clientId");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ workStatus: "", paymentStatus: "", category: "", billingModel: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [selectTypeModalOpen, setSelectTypeModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const listParams = { search: debouncedSearch, ...filters };

  const { list: projects, pagination, page, setPage, loading } = usePaginatedQuery(
    adminQueryKeys.projects(listParams),
    async (p) => {
      const { data } = await getProjects({ page: p, limit: 10, search: debouncedSearch, ...filters });
      return { list: data.data, pagination: data.pagination };
    },
    [debouncedSearch, filters.workStatus, filters.paymentStatus, filters.category, filters.billingModel]
  );

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
  };

  useEffect(() => {
    if (presetClientId) {
      setEditing(null);
      setModalOpen(true);
    }
  }, [presetClientId]);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await createProjectWithDeliverables(payload);
      toast.success("Project created");
      setModalOpen(false);
      navigate(adminPath("projects", data.data._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRecurring = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await createService(payload);
      toast.success("Recurring service created");
      setRecurringModalOpen(false);
      navigate(adminPath("projects", data.data._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create recurring service");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleUpdate = async (payload) => {
    if (!editing?._id) return;
    setSubmitting(true);
    try {
      await updateProject(editing._id, payload);
      toast.success("Project updated");
      setModalOpen(false);
      setEditing(null);
      refreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteProject(deleteId);
      toast.success("Project deleted");
      setDeleteId(null);
      refreshList();
    } catch {
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageToolbar className="flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-5">
          <SearchInput
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
            className="sm:col-span-2 lg:col-span-1"
          />
          <FilterSelect
            label="Billing"
            value={filters.billingModel}
            onChange={(v) => setFilters((f) => ({ ...f, billingModel: v }))}
            options={BILLING_MODEL_FILTER_OPTIONS}
          />
          <FilterSelect
            label="Status"
            value={filters.workStatus}
            onChange={(v) => setFilters((f) => ({ ...f, workStatus: v }))}
            options={WORK_STATUSES}
          />
          <FilterSelect
            label="Payment"
            value={filters.paymentStatus}
            onChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v }))}
            options={PAYMENT_STATUSES}
          />
          <FilterSelect
            label="Service"
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            options={SERVICE_CATEGORIES}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={() => setSelectTypeModalOpen(true)} className="w-full sm:w-auto">
            <Plus size={18} /> Add Service
          </Button>
        </div>
      </PageToolbar>

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-4">
          <Table
            columns={[
              { key: "client", label: "Client", render: (r) => r.clientName || "—" },
              { key: "project", label: "Project", render: (r) => getProjectLabel(r) },
              {
                key: "billingModel",
                label: "Billing",
                minWidth: 110,
                render: (r) => (
                  <Badge status={r.billingModel === "recurring" ? "Recurring" : "One-Time"} />
                ),
              },
              {
                key: "services",
                label: "Services",
                render: (r) => (
                  <ServicesPillList services={r.services} servicesCount={r.servicesCount} />
                ),
              },
              {
                key: "totalValue",
                label: "Total",
                minWidth: 100,
                render: (r) => formatCurrency(r.totalPrice ?? r.totalAmount ?? 0),
              },
              {
                key: "paymentStatus",
                label: "Payment",
                minWidth: 100,
                render: (r) => <Badge status={normalizePaymentStatus(r.paymentStatus)} />,
              },
              {
                key: "workStatus",
                label: "Status",
                minWidth: 120,
                render: (r) => <Badge status={r.overallStatus || r.workStatus} />,
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(r);
                        setModalOpen(true);
                      }}
                      className="text-xs font-medium text-admin-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(r._id);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            data={projects}
            onRowClick={(r) => navigate(adminPath("projects", r._id))}
          />
          <Pagination page={page} pages={pagination.pages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Project" : "New Project"}
        description={
          editing
            ? "Update project container details. Manage deliverables on the project page."
            : "Set up the project, add deliverables, and configure payment."
        }
        size="xl"
      >
        {editing ? (
          <ProjectEditForm
            key={editing._id}
            initial={editing}
            onSubmit={handleUpdate}
            loading={submitting}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            submitLabel="Save changes"
          />
        ) : (
          <ProjectWizard
            key={presetClientId || "new"}
            initial={presetClientId ? { clientId: presetClientId } : undefined}
            onSubmit={handleCreate}
            loading={submitting}
            onCancel={() => setModalOpen(false)}
            submitLabel="Create project"
          />
        )}
      </Modal>

      <Modal
        open={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        title="New Recurring Service"
        description="Set up a retainer with monthly billing, invoices, and prepaid credit."
        size="xl"
      >
        <RecurringProjectWizard
          initial={presetClientId ? { clientId: presetClientId } : undefined}
          onSubmit={handleCreateRecurring}
          loading={submitting}
          onCancel={() => setRecurringModalOpen(false)}
          submitLabel="Create recurring service"
        />
      </Modal>

      <Modal
        open={selectTypeModalOpen}
        onClose={() => setSelectTypeModalOpen(false)}
        title="Add Service"
        description="Select whether this is a one-time project or a recurring retainer service."
        size="md"
      >
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSelectTypeModalOpen(false);
              openCreate();
            }}
            className="flex flex-col items-start rounded-xl border border-admin-border/80 p-4 text-left transition-all hover:border-admin-primary hover:bg-admin-primary/5 hover:shadow-sm"
          >
            <div className="mb-3 rounded-lg bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100">
              <FolderKanban size={22} />
            </div>
            <h3 className="font-semibold text-admin-text">One-Time Service</h3>
            <p className="mt-1 text-xs text-admin-textMuted">
              Fixed price project with deliverables or milestones.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectTypeModalOpen(false);
              setRecurringModalOpen(true);
            }}
            className="flex flex-col items-start rounded-xl border border-admin-border/80 p-4 text-left transition-all hover:border-admin-primary hover:bg-admin-primary/5 hover:shadow-sm"
          >
            <div className="mb-3 rounded-lg bg-purple-50 p-2 text-purple-600 ring-1 ring-purple-100">
              <Repeat size={22} />
            </div>
            <h3 className="font-semibold text-admin-text">Recurring Service</h3>
            <p className="mt-1 text-xs text-admin-textMuted">
              Retainer or subscription model with recurring monthly billing.
            </p>
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Delete this project permanently?"
        danger
        loading={submitting}
      />
    </div>
  );
}
