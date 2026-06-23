export default function Card({ children, className = "", title, subtitle, action }) {
  return (
    <div
      className={`rounded-2xl border border-admin-border/80 bg-white shadow-sm shadow-slate-200/40 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200/50 ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-col gap-2 border-b border-admin-border/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold tracking-tight text-admin-text sm:text-lg">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-admin-textMuted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

const statAccents = {
  blue: { bar: "from-blue-500 to-indigo-500", icon: "from-blue-50 to-blue-100/80 border-blue-200/60 text-blue-600" },
  emerald: { bar: "from-emerald-500 to-teal-500", icon: "from-emerald-50 to-emerald-100/80 border-emerald-200/60 text-emerald-600" },
  amber: { bar: "from-amber-500 to-orange-500", icon: "from-amber-50 to-amber-100/80 border-amber-200/60 text-amber-600" },
  rose: { bar: "from-rose-500 to-pink-500", icon: "from-rose-50 to-rose-100/80 border-rose-200/60 text-rose-600" },
};

export function StatCard({ title, value, icon: Icon, trend, className = "", accent = "blue" }) {
  const style = statAccents[accent] || statAccents.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-admin-border/80 bg-white shadow-sm shadow-slate-200/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className={`h-1 bg-gradient-to-r ${style.bar}`} />
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-admin-textMuted sm:text-sm">{title}</p>
          <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-admin-text sm:text-2xl">
            {value}
          </p>
          {trend && <p className="mt-1 text-xs text-admin-textMuted">{trend}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-xl border bg-gradient-to-br p-2.5 sm:p-3 ${style.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
