import "./admin.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectList from "./pages/projects/ProjectList";
import ProjectDetail from "./pages/projects/ProjectDetail";
import ProjectDocuments from "./pages/projects/ProjectDocuments";
import Expenses from "./pages/Expenses";
import Freelancers from "./pages/Freelancers";
import ProfitLoss from "./pages/ProfitLoss";
import Contacts from "./pages/Contacts";
import ClientList from "./pages/clients/ClientList";
import ClientDetail from "./pages/clients/ClientDetail";
import LeadsPage from "./pages/leads/LeadsPage";
import LeadDetail from "./pages/leads/LeadDetail";

export default function AdminApp() {
  return (
    <AuthProvider>
      <div className="admin-panel min-h-screen bg-admin-muted text-admin-text">
        <Toaster
          position="top-center"
          containerStyle={{ top: 12 }}
          toastOptions={{
            style: {
              background: "#fff",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
            },
          }}
        />
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="clients" element={<ClientList />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="projects/:id/documents" element={<ProjectDocuments />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="freelancers" element={<Freelancers />} />
              <Route path="pl" element={<ProfitLoss />} />
              <Route path="contacts" element={<Contacts />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
