import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { getProjects, createProject, updateProject, deleteProject } from "../../api/projects.api";
import { useDebounce } from "../../hooks/useDebounce";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import FilterSelect from "../../components/ui/FilterSelect";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Pagination from "../../components/ui/Pagination";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageToolbar } from "../../components/layout/PageHeader";
import ProjectForm from "./ProjectForm";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { WORK_STATUSES, PAYMENT_STATUSES, PROJECT_TYPES, getProjectLabel } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

export default function ProjectList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get("clientId");
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ workStatus: "", paymentStatus: "", projectType: "" });
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
      const { data } = await createProject(payload);
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

  const openEdit = (project) => {
    setEditing(project);
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
            label="Type"
            value={filters.projectType}
            onChange={(v) => setFilters((f) => ({ ...f, projectType: v }))}
            options={PROJECT_TYPES}
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
                { key: "client", label: "Client", render: (r) => getProjectLabel(r) },
                { key: "projectType", label: "Type" },
                { key: "workStatus", label: "Status", render: (r) => <Badge status={r.workStatus} /> },
                { key: "paymentStatus", label: "Payment", render: (r) => <Badge status={r.paymentStatus} /> },
                { key: "totalAmount", label: "Amount", render: (r) => formatCurrency(r.totalAmount) },
                { key: "dateOfOnboarding", label: "Onboarded", render: (r) => formatDate(r.dateOfOnboarding) },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(r);
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
        description="Set up client, scope, payment, and delivery details."
        size="xl"
      >
        <ProjectForm
          key={editing?._id || presetClientId || "new"}
          initial={editing || (presetClientId ? { clientId: presetClientId } : undefined)}
          onSubmit={editing ? handleUpdate : handleCreate}
          loading={submitting}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? "Save changes" : "Create project"}
        />
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
