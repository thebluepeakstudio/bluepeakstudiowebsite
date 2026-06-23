import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from "../../api/blogCategories.api";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input, Textarea } from "../../components/ui/Input";
import { Form, FormFooter } from "../../components/ui/Form";
import { TableSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

const emptyCategory = { name: "", slug: "", description: "" };

export default function BlogCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    getBlogCategories()
      .then(({ data }) => setCategories(data.data))
      .catch(() => toast.error("Failed to load categories"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCategory);
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateBlogCategory(editing._id, form);
        toast.success("Category updated");
      } else {
        await createBlogCategory(form);
        toast.success("Category created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBlogCategory(deleteId);
      toast.success("Category deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Blog categories</h1>
        <Button onClick={openCreate}>
          <Plus size={18} /> Add category
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : categories.length === 0 ? (
        <p className="text-admin-textMuted">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-admin-border rounded-xl border border-admin-border bg-admin-surface">
          {categories.map((cat) => (
            <li key={cat._id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-admin-text">{cat.name}</p>
                <p className="text-xs text-admin-textMuted">{cat.slug}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => openEdit(cat)} className="rounded p-2 hover:bg-admin-muted">
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(cat._id)}
                  className="rounded p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit category" : "New category"}>
        <Form onSubmit={handleSubmit}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            hint="Optional — auto-generated from name if empty"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <FormFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? "Update" : "Create"}
            loading={submitting}
          />
        </Form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete category?"
        message="Categories with assigned blogs cannot be deleted."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        danger
      />
    </div>
  );
}
