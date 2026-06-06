import FilterSelect from "../ui/FilterSelect";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_PRIORITIES } from "../../utils/constants";

export default function LeadFilters({
  status,
  onStatusChange,
  source,
  onSourceChange,
  priority,
  onPriorityChange,
  assignedTo,
  onAssignedChange,
  admins = [],
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <FilterSelect
        className="min-w-0 sm:min-w-[9.5rem]"
        value={status}
        onChange={onStatusChange}
        options={[
          { value: "", label: "All stages" },
          ...LEAD_STAGES.map((s) => ({ value: s, label: s })),
        ]}
      />
      <FilterSelect
        className="min-w-0 sm:min-w-[9.5rem]"
        value={source}
        onChange={onSourceChange}
        options={[
          { value: "", label: "All sources" },
          ...LEAD_SOURCES.map((s) => ({ value: s, label: s })),
        ]}
      />
      <FilterSelect
        className="min-w-0 sm:min-w-[9.5rem]"
        value={priority}
        onChange={onPriorityChange}
        options={[
          { value: "", label: "All priorities" },
          ...LEAD_PRIORITIES.map((p) => ({ value: p, label: p })),
        ]}
      />
      <FilterSelect
        className="min-w-0 sm:min-w-[9.5rem]"
        value={assignedTo}
        onChange={onAssignedChange}
        options={[
          { value: "", label: "All assignees" },
          ...admins.map((a) => ({ value: a.id, label: a.name })),
        ]}
      />
    </div>
  );
}
