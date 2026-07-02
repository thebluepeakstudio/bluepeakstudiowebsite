import "./admin.css";
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { adminQueryClient } from "./queryClient";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectList = lazy(() => import("./pages/projects/ProjectList"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const ProjectDocuments = lazy(() => import("./pages/projects/ProjectDocuments"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Freelancers = lazy(() => import("./pages/Freelancers"));
const ProfitLoss = lazy(() => import("./pages/ProfitLoss"));
const ClientList = lazy(() => import("./pages/clients/ClientList"));
const ClientDetail = lazy(() => import("./pages/clients/ClientDetail"));
const LeadsPage = lazy(() => import("./pages/leads/LeadsPage"));
const LeadDetail = lazy(() => import("./pages/leads/LeadDetail"));
const BlogList = lazy(() => import("./pages/blog/BlogList"));
const BlogFormPage = lazy(() => import("./pages/blog/BlogFormPage"));
const BlogCategories = lazy(() => import("./pages/blog/BlogCategories"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
  </div>
);

export default function AdminApp() {
  return (
    <QueryClientProvider client={adminQueryClient}>
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
        <Suspense fallback={<PageLoader />}>
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
                <Route path="blog" element={<BlogList />} />
                <Route path="blog/new" element={<BlogFormPage />} />
                <Route path="blog/categories" element={<BlogCategories />} />
                <Route path="blog/:id/edit" element={<BlogFormPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
