import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const segmentTitles = {
  dashboard: "Dashboard",
  leads: "Leads",
  clients: "Clients",
  projects: "Projects",
  expenses: "Expenses",
  freelancers: "Freelancers",
  pl: "Profit & Loss",
  contacts: "Contacts",
  documents: "Documents",
};

function resolveTitle(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const adminIdx = parts.indexOf("admin-panel");
  const segments = adminIdx >= 0 ? parts.slice(adminIdx + 1) : parts;

  if (segments.length >= 2) {
    const parent = segments[0];
    const child = segments[1];
    if (parent === "leads" && child !== "leads") return "Lead Details";
    if (parent === "clients" && child !== "clients") return "Client Details";
    if (parent === "projects" && child !== "projects") {
      return segments[2] === "documents" ? "Project Documents" : "Project Details";
    }
  }

  const last = segments[segments.length - 1] || "dashboard";
  return segmentTitles[last] || "Admin";
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-admin-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
