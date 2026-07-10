import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getAdminPathSegments } from "../../utils/adminPaths";

const segmentTitles = {
  dashboard: "Dashboard",
  leads: "Leads",
  clients: "Clients",
  projects: "Projects",
  expenses: "Expenses",
  freelancers: "Freelancers",
  pl: "Profit & Loss",
  blog: "Blog",
  documents: "Documents",
};

function resolveTitle(pathname) {
  const segments = getAdminPathSegments(pathname);

  if (segments.length >= 2) {
    const parent = segments[0];
    const child = segments[1];
    if (parent === "leads" && child !== "leads") return "Lead Details";
    if (parent === "clients" && child !== "clients") return "Client Details";
    if (parent === "projects" && child !== "projects") {
      return segments[2] === "documents" ? "Project Documents" : "Project Details";
    }
    if (parent === "blog") {
      if (child === "new") return "New Blog";
      if (child === "categories") return "Blog Categories";
      if (segments[2] === "edit") return "Edit Blog";
      return "Blog";
    }
  }

  const last = segments[segments.length - 1] || "dashboard";
  return segmentTitles[last] || "Admin";
}

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-[17.5rem]">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          pathname={location.pathname}
        />
        <main className="admin-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="admin-content-inner mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-7">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
