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
  Newspaper,
  ExternalLink,
  MessageSquareQuote,
  PanelsTopLeft,
} from "lucide-react";
import { adminPath, adminHome, PUBLIC_SITE_URL } from "../../utils/adminPaths";

const LOGO_URL =
  "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/BPS.png?updatedAt=1773667763921";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: adminHome(), icon: LayoutDashboard, label: "Dashboard", end: true }],
  },
  {
    title: "CRM & Sales",
    items: [
      { to: adminPath("leads"), icon: Target, label: "Leads" },
      { to: adminPath("clients"), icon: Building2, label: "Clients" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: adminPath("projects"), icon: FolderKanban, label: "Projects" },
      { to: adminPath("freelancers"), icon: Users, label: "Freelancers" },
    ],
  },
  {
    title: "Content",
    items: [
      { to: adminPath("blog"), icon: Newspaper, label: "Blog" },
      { to: adminPath("testimonials"), icon: MessageSquareQuote, label: "Testimonials" },
      { to: adminPath("portfolio"), icon: PanelsTopLeft, label: "Portfolio" },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: adminPath("expenses"), icon: Receipt, label: "Expenses" },
      { to: adminPath("pl"), icon: TrendingUp, label: "P&L" },
    ],
  },
];

function NavItem({ to, icon: Icon, label, end, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-blue-500/15 text-white shadow-sm ring-1 ring-blue-400/20"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-blue-500/25 text-blue-300"
                : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200"
            }`}
          >
            <Icon size={17} strokeWidth={isActive ? 2.25 : 2} />
          </span>
          <span className="truncate">{label}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
          )}
        </>
      )}
    </NavLink>
  );
}

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
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-[17.5rem] flex-col border-r border-slate-800/80 bg-slate-950 transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={LOGO_URL}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg bg-white/10 object-contain p-1 ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">BluePeak Studio</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-800/80 p-4">
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <ExternalLink size={16} />
            View website
          </a>
        </div>
      </aside>
    </>
  );
}
