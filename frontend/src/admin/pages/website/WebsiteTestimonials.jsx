import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getWebsiteTestimonials,
  createWebsiteTestimonial,
  updateWebsiteTestimonial,
  deleteWebsiteTestimonial,
} from "../../api/websiteTestimonials.api";
import { useDebounce } from "../../hooks/useDebounce";
import { usePaginatedQuery } from "../../hooks/usePaginatedQuery";
import { adminQueryKeys } from "../../queryKeys";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import FilterSelect from "../../components/ui/FilterSelect";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import Badge from "../../components/ui/Badge";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { WEBSITE_STATUSES, emptyTestimonial } from "../../../types/website";
import toast from "react-hot-toast";

export default function WebsiteTestimonials() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTestimonial);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const listParams = {
    search: debouncedSearch || undefined,
    status: status || undefined,
  };

  const { list, pagination, page, setPage, loading } = usePaginatedQuery(
    adminQueryKeys.websiteTestimonials(listParams),
    async (p) => {
      const { data } = await getWebsiteTestimonials({ page: p, limit: 10, ...listParams });
      return { list: data.data, pagination: data.pagination };
    },
    [debouncedSearch, status]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "website-testimonials"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTestimonial);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      text: item.text || "",
      img: item.img || "",
      rating: item.rating ?? 5,
      sortOrder: item.sortOrder ?? 0,
      status: item.status || "Published",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.status === "Published" && !form.img?.trim()) {
      toast.error("Add an image URL before publishing");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        rating: Number(form.rating) || 5,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await updateWebsiteTestimonial(editing._id, payload);
        toast.success("Testimonial updated");
      } else {
        await createWebsiteTestimonial(payload);
        toast.success("Testimonial added");
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWebsiteTestimonial(deleteId);
      toast.success("Deleted");
      setDeleteId(null);
      refresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-admin-text">Testimonials</h1>
          <p className="text-sm text-admin-textMuted">
            Homepage shows Published items only. Form submissions arrive as Draft — add an image, then publish.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Add testimonial
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search testimonials..." />
        </div>
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[140px]"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...WEBSITE_STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-sm text-admin-textMuted">No testimonials yet</p>
        </div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: "name",
                label: "Client",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    {r.img ? (
                      <img
                        src={r.img}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-muted text-xs font-semibold text-admin-textMuted">
                        {(r.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-admin-text">{r.name}</p>
                      <p className="line-clamp-1 max-w-md text-xs text-admin-textMuted">{r.text}</p>
                      {r.source === "form" && (
                        <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600">
                          From form · add image to publish
                        </p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "rating",
                label: "Rating",
                render: (r) => `${r.rating || 5}/5`,
              },
              {
                key: "sortOrder",
                label: "Order",
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge status={r.status} />,
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(r._id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={list}
            emptyMessage="No testimonials"
          />
          <Pagination page={page} pages={pagination?.pages || 1} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit testimonial" : "Add testimonial"}
      >
        <Form onSubmit={handleSubmit}>
          <FormSection>
            <FormGrid>
              <Input
                label="Client name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Image URL"
                value={form.img}
                onChange={(e) => setForm((f) => ({ ...f, img: e.target.value }))}
                placeholder="https://ik.imagekit.io/..."
                hint="Required before publishing to the homepage"
              />
              <Select
                label="Rating"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} stars` }))}
              />
              <Input
                label="Sort order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                options={WEBSITE_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </FormGrid>
            <Textarea
              label="Quote"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={4}
              required
            />
          </FormSection>
          <FormFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editing ? "Save changes" : "Add testimonial"}
            </Button>
          </FormFooter>
        </Form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete testimonial?"
        message="This removes it from the homepage. You can always add it again later."
        danger
      />
    </div>
  );
}
