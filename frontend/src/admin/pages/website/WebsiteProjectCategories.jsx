import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getWebsiteProjectCategories,
  createWebsiteProjectCategory,
  updateWebsiteProjectCategory,
  deleteWebsiteProjectCategory,
} from "../../api/websiteProjectCategories.api";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import { Form, FormFooter } from "../../components/ui/Form";
import { TableSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

const emptyCategory = { name: "" };

export default function WebsiteProjectCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    getWebsiteProjectCategories()
      .then(({ data }) => setCategories(data.data || []))
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
    setForm({ name: cat.name });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateWebsiteProjectCategory(editing._id, form);
        toast.success("Category updated");
      } else {
        await createWebsiteProjectCategory(form);
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
      await deleteWebsiteProjectCategory(deleteId);
      toast.success("Category deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-admin-text">Portfolio categories</h1>
          <p className="text-sm text-admin-textMuted">
            Create custom categories used when adding portfolio projects
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> New category
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-sm text-admin-textMuted">No categories yet</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus size={18} /> New category
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin-border bg-white">
          <ul className="divide-y divide-admin-border">
            {categories.map((cat) => (
              <li key={cat._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-admin-text">{cat.name}</p>
                  <p className="text-xs text-admin-textMuted">{cat.slug}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="rounded p-2 text-admin-textMuted hover:bg-admin-muted"
                  >
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
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit category" : "New category"}
      >
        <Form onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
            required
            placeholder="e.g. SaaS Dashboard"
          />
          <FormFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editing ? "Save" : "Create"}
            </Button>
          </FormFooter>
        </Form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete category?"
        message="Projects using this category keep their category text; only the option is removed."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        danger
      />
    </div>
  );
}
