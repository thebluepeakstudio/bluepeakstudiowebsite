import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Users,
  TrendingUp,
  Building2,
  Target,
  X,
} from "lucide-react";

const navItems = [
  { to: "/admin-panel/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin-panel/clients", icon: Building2, label: "Clients" },
  { to: "/admin-panel/projects", icon: FolderKanban, label: "Projects" },
  { to: "/admin-panel/expenses", icon: Receipt, label: "Expenses" },
  { to: "/admin-panel/freelancers", icon: Users, label: "Freelancers" },
  { to: "/admin-panel/leads", icon: Target, label: "Leads" },
  { to: "/admin-panel/pl", icon: TrendingUp, label: "P&L" },
];

export default function Sidebar({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-admin-border bg-admin-surface transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-admin-border px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-admin-primary">
              BluePeak
            </p>
            <p className="text-sm font-bold text-admin-text">Admin Panel</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-admin-muted lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-blue-50 text-admin-primary"
                    : "text-admin-textMuted hover:bg-admin-muted hover:text-admin-text"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
