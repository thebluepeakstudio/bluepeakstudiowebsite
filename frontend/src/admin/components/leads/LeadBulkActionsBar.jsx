import Button from "../ui/Button";
import FilterSelect from "../ui/FilterSelect";
import { LEAD_STAGES, LEAD_PRIORITIES } from "../../utils/constants";

export default function LeadBulkActionsBar({
  selectedCount,
  onDelete,
  onStatus,
  onAssign,
  onPriority,
  admins = [],
  loading,
}) {
  if (!selectedCount) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-admin-border bg-admin-surface px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <FilterSelect
        showAll={false}
        value=""
        onChange={(v) => v && onStatus(v)}
        options={[{ value: "", label: "Change stage..." }, ...LEAD_STAGES.map((s) => ({ value: s, label: s }))]}
      />
      <FilterSelect
        showAll={false}
        value=""
        onChange={(v) => v && onPriority(v)}
        options={[{ value: "", label: "Set priority..." }, ...LEAD_PRIORITIES.map((p) => ({ value: p, label: p }))]}
      />
      <FilterSelect
        showAll={false}
        value=""
        onChange={(v) => onAssign(v || null)}
        options={[
          { value: "", label: "Assign to..." },
          ...admins.map((a) => ({ value: a.id, label: a.name })),
        ]}
      />
      <Button variant="danger" size="sm" onClick={onDelete} loading={loading}>
        Delete
      </Button>
    </div>
  );
}
