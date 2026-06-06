import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2 } from "lucide-react";
import { getClients, createClient, updateClient, deleteClient } from "../../api/clients.api";
import { useDebounce } from "../../hooks/useDebounce";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import FilterSelect from "../../components/ui/FilterSelect";
import ClientFormModal, { emptyClient } from "./ClientFormModal";
import Badge from "../../components/ui/Badge";
import { CLIENT_STATUSES } from "../../utils/constants";
import { formatDate } from "../../utils/formatCurrency";
import { TableSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

export default function ClientList() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const fetch = (page = 1) => {
    setLoading(true);
    getClients({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    })
      .then(({ data }) => {
        setList(data.data);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch(1);
  }, [debouncedSearch, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateClient(editing._id, form);
        toast.success("Client updated");
      } else {
        await createClient(form);
        toast.success("Client added");
      }
      setModalOpen(false);
      setEditing(null);
      fetch(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
        </div>
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[160px]"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "", label: "All statuses" }, ...CLIENT_STATUSES.map((s) => ({ value: s, label: s }))]}
        />
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setForm(emptyClient);
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Client
        </Button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table
            onRowClick={(r) => navigate(`/admin-panel/clients/${r._id}`)}
            columns={[
              { key: "name", label: "Name" },
              { key: "companyName", label: "Company" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge status={r.status}>{r.status}</Badge>,
              },
              {
                key: "createdAt",
                label: "Created",
                render: (r) => formatDate(r.createdAt),
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r);
                        setForm({ ...emptyClient, ...r });
                        setModalOpen(true);
                      }}
                      className="text-xs text-admin-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(r._id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            data={list}
            emptyIcon={Building2}
            emptyMessage="No clients yet"
          />
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={fetch} />
        </>
      )}

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={submitting}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await deleteClient(deleteId);
            toast.success("Client deleted");
            fetch(pagination.page);
          } catch (err) {
            toast.error(err.response?.data?.message || "Delete failed");
          }
          setDeleteId(null);
        }}
        title="Delete client?"
        message="This cannot be undone. Clients with projects cannot be deleted."
      />
    </div>
  );
}
