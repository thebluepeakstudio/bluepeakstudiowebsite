import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function PageHeader({ title, description, action, className = "" }) {
  return (
    <div
      className={`admin-page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {title && (
          <h2 className="text-xl font-bold tracking-tight text-admin-text sm:text-2xl">{title}</h2>
        )}
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-admin-textMuted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageSection({ title, description, action, children, className = "" }) {
  return (
    <section className={`admin-page-section space-y-4 ${className}`}>
      {(title || action) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold tracking-tight text-admin-text sm:text-lg">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-admin-textMuted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageToolbar({ children, className = "" }) {
  return (
    <div className={`admin-toolbar ${className}`}>
      {children}
    </div>
  );
}

export function LinkAction({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-admin-primary transition-colors hover:text-admin-primaryDark"
    >
      {children}
      <ChevronRight size={14} />
    </Link>
  );
}
