import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Input, Textarea, Select } from "../ui/Input";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../api/deliverables.api";
import { getFreelancers } from "../../api/freelancers.api";
import { SERVICE_CATEGORIES, DELIVERABLE_STATUSES, DELIVERABLE_AMOUNT_LABEL } from "../../utils/constants";
import toast from "react-hot-toast";

const cloneAssignments = (rows) =>
  Array.isArray(rows)
    ? rows.map((a) => ({
        ...a,
        freelancerId: a.freelancerId
          ? typeof a.freelancerId === "object"
            ? { ...a.freelancerId }
            : a.freelancerId
          : a.freelancerId,
      }))
    : [];

export default function DeliverableDrawer({
  open,
  deliverable,
  projectId,
  onClose,
  onSave,
  onDelete,
  onAssignmentsChange,
}) {
  const [form, setForm] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    freelancerId: "",
    cost: 0,
  });

  const deliverableId = deliverable?._id;

  useEffect(() => {
    if (!open || !deliverableId) return;
    setForm({
      title: deliverable.title || "",
      category: deliverable.category || "Website",
      description: deliverable.description || "",
      sellingPrice: deliverable.sellingPrice ?? 0,
      status: deliverable.status || "Not Started",
    });
    setAssignments(cloneAssignments(deliverable.assignments));
    setNewAssignment({ freelancerId: "", cost: 0 });
  }, [open, deliverableId, deliverable]);

  useEffect(() => {
    if (!open || !form?.category) return;
    getFreelancers({ limit: 50, skill: form.category, lite: 1 })
      .then(({ data }) => setFreelancers(data.data))
      .catch(() => setFreelancers([]));
  }, [open, form?.category]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !form || !deliverableId) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        sellingPrice: Number(form.sellingPrice) || 0,
      });
      toast.success("Deliverable saved");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.freelancerId) {
      toast.error("Select a freelancer");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await createAssignment(projectId, deliverableId, {
        freelancerId: newAssignment.freelancerId,
        cost: Number(newAssignment.cost) || 0,
      });
      const next = [...assignments, data.data];
      setAssignments(next);
      setNewAssignment({ freelancerId: "", cost: 0 });
      await onAssignmentsChange?.();
      toast.success("Freelancer assigned");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    setSubmitting(true);
    try {
      await deleteAssignment(projectId, deliverableId, assignmentId);
      const next = assignments.filter((a) => a._id !== assignmentId);
      setAssignments(next);
      await onAssignmentsChange?.();
      toast.success("Assignment removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Remove failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignmentCost = async (assignmentId, value) => {
    try {
      const { data } = await updateAssignment(projectId, deliverableId, assignmentId, {
        cost: Number(value) || 0,
      });
      const next = assignments.map((a) => (a._id === assignmentId ? data.data : a));
      setAssignments(next);
      await onAssignmentsChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="fixed inset-y-0 right-0 flex h-dvh w-full max-w-xl flex-col bg-admin-surface shadow-xl lg:max-w-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-admin-border px-4 py-3">
          <div>
            <h3 className="text-lg font-bold text-admin-text">{form.title || "Deliverable"}</h3>
            <p className="text-sm text-admin-textMuted">Edit details and assign freelancers</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-admin-muted">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-admin-border bg-admin-muted/20 p-4">
                <h4 className="mb-3 text-sm font-bold text-admin-text">Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                  <Select
                    label="Category"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    options={SERVICE_CATEGORIES}
                  />
                  <Input
                    label={DELIVERABLE_AMOUNT_LABEL}
                    type="number"
                    min="0"
                    value={form.sellingPrice}
                    onChange={(e) => set("sellingPrice", e.target.value)}
                  />
                  <Select
                    label="Status"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    options={DELIVERABLE_STATUSES}
                  />
                </div>
                <div className="mt-3">
                  <Textarea
                    label="Description"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-admin-border p-4">
                <h4 className="mb-3 text-sm font-bold text-admin-text">Assign freelancers</h4>
                {assignments.length > 0 && (
                  <div className="mb-4 overflow-x-auto rounded-lg border border-admin-border">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead className="bg-admin-muted text-left text-xs uppercase text-admin-textMuted">
                        <tr>
                          <th className="px-3 py-2">Freelancer</th>
                          <th className="px-3 py-2">Cost</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a._id} className="border-t border-admin-border">
                            <td className="px-3 py-2">{a.freelancerId?.name || "—"}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                className="w-28 rounded border border-admin-border px-2 py-1 text-sm"
                                value={a.cost ?? 0}
                                onChange={(e) => handleUpdateAssignmentCost(a._id, e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Badge status={a.paymentStatus} />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveAssignment(a._id)}
                                className="text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Freelancer"
                    value={newAssignment.freelancerId}
                    onChange={(e) => setNewAssignment((p) => ({ ...p, freelancerId: e.target.value }))}
                    options={[
                      { value: "", label: "Select…" },
                      ...freelancers.map((f) => ({ value: f._id, label: f.name })),
                    ]}
                  />
                  <Input
                    label="Cost (₹)"
                    type="number"
                    min="0"
                    value={newAssignment.cost}
                    onChange={(e) => setNewAssignment((p) => ({ ...p, cost: e.target.value }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={handleAddAssignment}
                  loading={submitting}
                >
                  <Plus size={16} /> Assign freelancer
                </Button>
              </div>
            </div>
          </div>

          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-admin-border bg-admin-surface px-4 py-3">
            <Button type="submit" loading={submitting}>
              Save deliverable
            </Button>
            {onDelete && (
              <Button type="button" variant="ghost" className="text-red-600" onClick={onDelete}>
                Delete
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </footer>
        </form>
      </aside>
    </div>,
    document.body
  );
}
