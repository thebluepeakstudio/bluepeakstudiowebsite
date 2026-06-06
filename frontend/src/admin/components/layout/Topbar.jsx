import { Menu, LogOut, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";

export default function Topbar({ onMenuClick, title }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin-panel/login");
  };

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-admin-border bg-admin-surface px-3 sm:h-16 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-admin-textMuted transition-colors hover:bg-admin-muted lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-base font-semibold text-admin-text sm:text-lg">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-admin-textMuted transition-colors hover:bg-admin-muted sm:block"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <div className="hidden text-right md:block">
          <p className="max-w-[140px] truncate text-sm font-medium text-admin-text lg:max-w-none">
            {admin?.name}
          </p>
          <p className="max-w-[140px] truncate text-xs text-admin-textMuted lg:max-w-none">
            {admin?.email}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0">
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
