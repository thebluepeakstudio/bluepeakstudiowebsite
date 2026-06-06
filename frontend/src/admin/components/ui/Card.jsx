export default function Card({ children, className = "", title, action }) {
  return (
    <div
      className={`rounded-xl border border-admin-border bg-admin-surface p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <h3 className="text-base font-semibold text-admin-text sm:text-lg">{title}</h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ title, value, icon: Icon, trend, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-admin-border bg-admin-surface p-4 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-admin-textMuted sm:text-sm">{title}</p>
          <p className="mt-1 truncate text-xl font-bold text-admin-text sm:text-2xl">{value}</p>
          {trend && <p className="mt-1 text-xs text-admin-textMuted">{trend}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-admin-primary sm:p-2.5">
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
