import { Menu, LogOut, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { adminPath, adminHome, adminLogin, getAdminPathSegments } from "../../utils/adminPaths";

const breadcrumbMeta = {
  dashboard: { group: "Overview", href: adminHome() },
  leads: { group: "CRM & Sales", href: adminPath("leads") },
  clients: { group: "CRM & Sales", href: adminPath("clients") },
  projects: { group: "Operations", href: adminPath("projects") },
  freelancers: { group: "Operations", href: adminPath("freelancers") },
  blog: { group: "Content", href: adminPath("blog") },
  expenses: { group: "Finance", href: adminPath("expenses") },
  pl: { group: "Finance", href: adminPath("pl") },
};

function getBreadcrumb(pathname) {
  const segments = getAdminPathSegments(pathname);
  const root = segments[0] || "dashboard";
  const meta = breadcrumbMeta[root] || { group: "Admin", href: adminHome() };
  return { ...meta, root };
}

export default function Topbar({ onMenuClick, title, pathname }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const crumb = getBreadcrumb(pathname);

  const handleLogout = () => {
    logout();
    navigate(adminLogin());
  };

  const initials =
    admin?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="admin-topbar z-20 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-[4.25rem] sm:px-5 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="shrink-0 rounded-xl border border-transparent p-2 text-admin-textMuted transition-all hover:border-admin-border hover:bg-admin-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <nav
              className="mb-0.5 hidden items-center gap-1 text-[11px] font-medium text-admin-textMuted sm:flex"
              aria-label="Breadcrumb"
            >
              <Link to={crumb.href} className="transition-colors hover:text-admin-primary">
                {crumb.group}
              </Link>
              <ChevronRight size={12} className="opacity-50" />
              <span className="text-admin-text">{title}</span>
            </nav>
            <h1 className="truncate text-base font-bold tracking-tight text-admin-text sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <p className="hidden text-xs font-medium text-admin-textMuted xl:block">{today}</p>
          <div className="hidden h-8 w-px bg-admin-border md:block" aria-hidden="true" />
          <div className="hidden items-center gap-2.5 rounded-2xl border border-admin-border/80 bg-slate-50/80 py-1 pl-1 pr-3 md:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm shadow-blue-500/25">
              {initials}
            </span>
            <div className="min-w-0 text-left">
              <p className="max-w-[120px] truncate text-sm font-semibold text-admin-text lg:max-w-[160px]">
                {admin?.name}
              </p>
              <p className="max-w-[120px] truncate text-[11px] text-admin-textMuted lg:max-w-[160px]">
                {admin?.email}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="shrink-0 rounded-xl border-admin-border/80 bg-white shadow-sm"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
