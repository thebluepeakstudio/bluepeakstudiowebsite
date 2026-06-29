import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { getProjects, createProjectWithDeliverables, updateProject, deleteProject } from "../../api/projects.api";
import { useDebounce } from "../../hooks/useDebounce";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import FilterSelect from "../../components/ui/FilterSelect";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import ServicesPillList from "../../components/projects/ServicesPillList";
import Pagination from "../../components/ui/Pagination";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageToolbar } from "../../components/layout/PageHeader";
import ProjectWizard from "./ProjectWizard";
import ProjectEditForm from "./ProjectEditForm";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { WORK_STATUSES, PAYMENT_STATUSES, SERVICE_CATEGORIES, getProjectLabel, normalizePaymentStatus } from "../../utils/constants";
import toast from "react-hot-toast";

export default function ProjectList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get("clientId");
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ workStatus: "", paymentStatus: "", category: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const fetch = (page = 1) => {
    setLoading(true);
    getProjects({ page, limit: 10, search: debouncedSearch, ...filters })
      .then(({ data }) => {
        setProjects(data.data);
        setPagination(data.pagination);
      })
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch(1);
  }, [debouncedSearch, filters]);

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
      navigate(`/admin-panel/projects/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
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
      fetch(pagination.page);
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
      fetch(pagination.page);
    } catch {
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageToolbar className="flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
          <SearchInput
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
            className="sm:col-span-2 lg:col-span-1"
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
        <Button onClick={openCreate} className="w-full shrink-0 sm:w-auto">
          <Plus size={18} /> Add Project
        </Button>
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
                key: "services",
                label: "Services",
                render: (r) => (
                  <ServicesPillList services={r.services} servicesCount={r.servicesCount} />
                ),
              },
              {
                key: "paymentStatus",
                label: "Payment",
                render: (r) => <Badge status={normalizePaymentStatus(r.paymentStatus)} />,
              },
              {
                key: "workStatus",
                label: "Status",
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
            onRowClick={(r) => navigate(`/admin-panel/projects/${r._id}`)}
          />
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={fetch} />
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
