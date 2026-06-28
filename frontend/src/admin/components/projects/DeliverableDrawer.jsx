import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Input, Textarea, Select } from "../ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../ui/Form";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../api/deliverables.api";
import { getFreelancers } from "../../api/freelancers.api";
import { SERVICE_CATEGORIES, DELIVERABLE_STATUSES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

export default function DeliverableDrawer({ open, deliverable, projectId, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    freelancerId: "",
    role: "",
    cost: 0,
    remarks: "",
  });

  useEffect(() => {
    if (deliverable) {
      setForm({
        title: deliverable.title || "",
        category: deliverable.category || "Website",
        description: deliverable.description || "",
        sellingPrice: deliverable.sellingPrice ?? 0,
        expectedCompletion: deliverable.expectedCompletion?.slice?.(0, 10) || "",
        actualCompletion: deliverable.actualCompletion?.slice?.(0, 10) || "",
        status: deliverable.status || "Not Started",
        progress: deliverable.progress ?? 0,
      });
      setAssignments(deliverable.assignments || []);
    }
  }, [deliverable]);

  useEffect(() => {
    if (!open || !form?.category) return;
    getFreelancers({ limit: 50, skill: form.category, lite: 1 })
      .then(({ data }) => setFreelancers(data.data))
      .catch(() => setFreelancers([]));
  }, [open, form?.category]);

  if (!open || !form) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const totalCost = assignments.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
  const profit = (Number(form.sellingPrice) || 0) - totalCost;

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        sellingPrice: Number(form.sellingPrice) || 0,
        progress: Number(form.progress) || 0,
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
      const { data } = await createAssignment(projectId, deliverable._id, {
        freelancerId: newAssignment.freelancerId,
        role: newAssignment.role || "General",
        cost: Number(newAssignment.cost) || 0,
        remarks: newAssignment.remarks,
      });
      setAssignments((prev) => [...prev, data.data]);
      setNewAssignment({ freelancerId: "", role: "", cost: 0, remarks: "" });
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
      await deleteAssignment(projectId, deliverable._id, assignmentId);
      setAssignments((prev) => prev.filter((a) => a._id !== assignmentId));
      toast.success("Assignment removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Remove failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (assignmentId, field, value) => {
    const assignment = assignments.find((a) => a._id === assignmentId);
    if (!assignment) return;
    const payload = {
      role: assignment.role,
      cost: assignment.cost,
      remarks: assignment.remarks,
      [field]: field === "cost" ? Number(value) || 0 : value,
    };
    try {
      const { data } = await updateAssignment(projectId, deliverable._id, assignmentId, payload);
      setAssignments((prev) => prev.map((a) => (a._id === assignmentId ? data.data : a)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-admin-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-admin-text">{form.title || "Deliverable"}</h3>
            <p className="text-sm text-admin-textMuted">Edit deliverable and assign freelancers</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-admin-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <Form onSubmit={handleSave}>
            <FormSection title="Details">
              <FormGrid cols={2}>
                <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  options={SERVICE_CATEGORIES}
                />
                <Input
                  label="Selling price (₹)"
                  type="number"
                  min="0"
                  value={form.sellingPrice}
                  onChange={(e) => set("sellingPrice", e.target.value)}
                />
                <Input
                  label="Progress (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(e) => set("progress", e.target.value)}
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  options={DELIVERABLE_STATUSES}
                />
                <Input
                  label="Expected completion"
                  type="date"
                  value={form.expectedCompletion}
                  onChange={(e) => set("expectedCompletion", e.target.value)}
                />
              </FormGrid>
              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FormSection>

            <FormSection title="Profit" variant="muted">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-admin-textMuted">Selling price</p>
                  <p className="font-semibold">{formatCurrency(form.sellingPrice)}</p>
                </div>
                <div>
                  <p className="text-admin-textMuted">Freelancer cost</p>
                  <p className="font-semibold">{formatCurrency(totalCost)}</p>
                </div>
                <div>
                  <p className="text-admin-textMuted">Profit</p>
                  <p className={`font-semibold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(profit)}
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection title="Assign freelancers">
              {assignments.length > 0 && (
                <div className="mb-4 overflow-x-auto rounded-lg border border-admin-border">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead className="bg-admin-muted text-left text-xs uppercase text-admin-textMuted">
                      <tr>
                        <th className="px-3 py-2">Freelancer</th>
                        <th className="px-3 py-2">Role</th>
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
                              className="w-full rounded border border-admin-border px-2 py-1 text-sm"
                              value={a.role || ""}
                              onChange={(e) => handleUpdateAssignment(a._id, "role", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              className="w-24 rounded border border-admin-border px-2 py-1 text-sm"
                              value={a.cost ?? 0}
                              onChange={(e) => handleUpdateAssignment(a._id, "cost", e.target.value)}
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

              <div className="grid gap-3 rounded-xl border border-admin-border p-3 sm:grid-cols-2">
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
                  label="Role"
                  value={newAssignment.role}
                  onChange={(e) => setNewAssignment((p) => ({ ...p, role: e.target.value }))}
                  placeholder="e.g. Frontend Developer"
                />
                <Input
                  label="Cost (₹)"
                  type="number"
                  min="0"
                  value={newAssignment.cost}
                  onChange={(e) => setNewAssignment((p) => ({ ...p, cost: e.target.value }))}
                />
                <Input
                  label="Remarks"
                  value={newAssignment.remarks}
                  onChange={(e) => setNewAssignment((p) => ({ ...p, remarks: e.target.value }))}
                />
              </div>
              <Button type="button" variant="secondary" className="mt-3" onClick={handleAddAssignment} loading={submitting}>
                <Plus size={16} /> Assign freelancer
              </Button>
            </FormSection>

            <div className="flex flex-wrap gap-2 border-t border-admin-border pt-4">
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
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
