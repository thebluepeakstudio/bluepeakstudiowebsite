import { Plus, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Input, Select } from "../ui/Input";

const emptyAssignment = () => ({ freelancerId: "", fee: "" });

export function buildDeliverableDraft(deliverable) {
  let assignments = [];
  if (deliverable.freelancerAssignments?.length) {
    assignments = deliverable.freelancerAssignments.map((row) => ({
      freelancerId: String(row.freelancerId?._id || row.freelancerId || ""),
      fee: row.fee ?? "",
    }));
  } else if (deliverable.freelancerId) {
    assignments = [
      {
        freelancerId: String(deliverable.freelancerId?._id || deliverable.freelancerId),
        fee: deliverable.freelancerFee ?? "",
      },
    ];
  }
  return { assignments };
}

export function getFreelancerAssignments(deliverable) {
  if (deliverable.freelancerAssignments?.length) {
    return deliverable.freelancerAssignments;
  }
  if (deliverable.freelancerId) {
    return [
      {
        freelancerId: deliverable.freelancerId,
        fee: deliverable.freelancerFee ?? 0,
      },
    ];
  }
  return [];
}

export default function CycleDeliverableFreelancerModal({
  open,
  deliverable,
  periodLabel,
  draft,
  freelancers,
  saving,
  onClose,
  onDraftChange,
  onSave,
}) {
  if (!deliverable) return null;

  const updateAssignment = (index, key, value) => {
    onDraftChange({
      ...draft,
      assignments: draft.assignments.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      ),
    });
  };

  const addAssignment = () => {
    onDraftChange({
      ...draft,
      assignments: [...draft.assignments, emptyAssignment()],
    });
  };

  const removeAssignment = (index) => {
    onDraftChange({
      ...draft,
      assignments: draft.assignments.filter((_, i) => i !== index),
    });
  };

  const isInHouse = draft.assignments.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Freelancers — ${deliverable.title}`}
      description={periodLabel ? `Billing period: ${periodLabel}` : undefined}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-admin-textMuted">
            {isInHouse
              ? "In-house — no freelancers assigned."
              : `${draft.assignments.length} freelancer${draft.assignments.length === 1 ? "" : "s"} assigned`}
          </p>
          <button
            type="button"
            onClick={addAssignment}
            className="inline-flex items-center gap-1 text-sm font-medium text-admin-primary hover:underline"
          >
            <Plus size={14} /> Add freelancer
          </button>
        </div>

        {isInHouse ? (
          <p className="rounded-lg border border-dashed border-admin-border bg-admin-muted/20 px-4 py-6 text-center text-sm text-admin-textMuted">
            Click &ldquo;Add freelancer&rdquo; to assign outsourced work, or save as in-house.
          </p>
        ) : (
          <div className="space-y-3">
            {draft.assignments.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-admin-border bg-admin-muted/30 p-3 sm:grid-cols-[1fr_140px_auto]"
              >
                <Select
                  label={index === 0 ? "Freelancer" : undefined}
                  value={row.freelancerId}
                  onChange={(e) => updateAssignment(index, "freelancerId", e.target.value)}
                  options={[
                    { value: "", label: "Select freelancer…" },
                    ...freelancers.map((f) => ({ value: String(f._id), label: f.name })),
                  ]}
                />
                <Input
                  label={index === 0 ? "Agreed fee (₹)" : undefined}
                  type="number"
                  min="0"
                  value={row.fee}
                  onChange={(e) => updateAssignment(index, "fee", e.target.value)}
                  placeholder="0"
                  disabled={!row.freelancerId}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeAssignment(index)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Remove freelancer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-admin-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
