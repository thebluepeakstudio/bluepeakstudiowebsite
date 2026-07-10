import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminLogin } from "../../utils/adminPaths";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-muted">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-admin-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={adminLogin()} replace />;
  }

  return <Outlet />;
}
