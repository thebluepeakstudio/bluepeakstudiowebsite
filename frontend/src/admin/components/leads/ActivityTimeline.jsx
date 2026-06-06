import { Phone, Mail, Calendar, FileText, CheckSquare } from "lucide-react";
import { formatDate } from "../../utils/formatCurrency";

const typeIcons = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  note: FileText,
  task: CheckSquare,
};

export default function ActivityTimeline({ activities = [], emptyMessage = "No activities yet" }) {
  if (!activities.length) {
    return <p className="text-sm text-admin-textMuted">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-4">
      {activities.map((a) => {
        const Icon = typeIcons[a.type] || FileText;
        return (
          <li key={a._id} className="relative flex gap-3 border-l-2 border-admin-border pl-4 pb-1">
            <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-admin-surface ring-2 ring-admin-border">
              <Icon size={10} className="text-admin-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-admin-textMuted">{a.type}</span>
                {a.title && <span className="text-sm font-medium text-admin-text">{a.title}</span>}
              </div>
              {a.body && <p className="mt-1 text-sm text-admin-textMuted whitespace-pre-wrap">{a.body}</p>}
              <p className="mt-1 text-xs text-admin-textMuted">
                {formatDate(a.occurredAt || a.createdAt)}
                {a.createdBy ? ` · ${a.createdBy}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
