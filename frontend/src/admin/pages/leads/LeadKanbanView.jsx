import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { LEAD_STAGES } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import { useState } from "react";

function KanbanCard({ lead, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead._id,
    data: { lead },
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-admin-border bg-admin-surface p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="font-medium text-admin-text">{lead.fullName}</p>
      {lead.companyName && <p className="text-xs text-admin-textMuted">{lead.companyName}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge status={lead.priority}>{lead.priority}</Badge>
        {lead.estimatedProjectValue > 0 && (
          <span className="text-xs text-admin-textMuted">{formatCurrency(lead.estimatedProjectValue)}</span>
        )}
      </div>
      {lead.nextFollowUpDate && (
        <p className="mt-1 text-xs text-admin-textMuted">Follow-up: {formatDate(lead.nextFollowUpDate)}</p>
      )}
    </div>
  );
}

function KanbanColumn({ stage, leads, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(85vw,260px)] shrink-0 snap-center flex-col rounded-xl border bg-admin-muted/40 sm:min-w-[240px] sm:w-auto sm:flex-1 ${
        isOver ? "border-admin-primary ring-2 ring-blue-100" : "border-admin-border"
      }`}
    >
      <div className="border-b border-admin-border px-3 py-2">
        <h3 className="text-sm font-semibold text-admin-text">{stage}</h3>
        <span className="text-xs text-admin-textMuted">{leads.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: "65vh" }}>
        {leads.map((lead) => (
          <div key={lead._id} onClick={() => onCardClick(lead._id)}>
            <KanbanCard lead={lead} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadKanbanView({ grouped, onStatusChange }) {
  const navigate = useNavigate();
  const [activeLead, setActiveLead] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const data = grouped || {};
    return LEAD_STAGES.map((stage) => ({ stage, leads: data[stage] || [] }));
  }, [grouped]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over || !active) return;

    const lead = active.data.current?.lead;
    const newStatus = over.id;
    if (!lead || lead.status === newStatus || !LEAD_STAGES.includes(newStatus)) return;

    await onStatusChange(lead._id, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveLead(e.active.data.current?.lead)}
      onDragEnd={handleDragEnd}
    >
      <div className="-mx-1 flex gap-3 overflow-x-auto scroll-smooth px-1 pb-4 snap-x snap-mandatory">
        {columns.map(({ stage, leads }) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={leads}
            onCardClick={(id) => navigate(`/admin-panel/leads/${id}`)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="w-[240px] rounded-lg border border-admin-primary bg-admin-surface p-3 shadow-lg">
            <p className="font-medium">{activeLead.fullName}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
