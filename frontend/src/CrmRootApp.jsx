import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminApp from "./admin/AdminApp";
import { normalizeLegacyAdminPath } from "./admin/utils/adminPaths";

function LegacyAdminRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = normalizeLegacyAdminPath(pathname);
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

export default function CrmRootApp() {
  return (
    <Routes>
      <Route path="/admin-panel/*" element={<LegacyAdminRedirect />} />
      <Route path="/*" element={<AdminApp />} />
    </Routes>
  );
}
