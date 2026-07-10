import { Link } from "react-router-dom";
import { adminHome } from "../utils/adminPaths";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-admin-muted px-4 text-center">
      <h1 className="text-6xl font-bold text-admin-text">404</h1>
      <p className="mt-2 text-lg text-admin-textMuted">Page not found</p>
      <Link to={adminHome()} className="mt-6 text-sm font-medium text-admin-primary hover:underline">
        Go to Dashboard
      </Link>
    </div>
  );
}
