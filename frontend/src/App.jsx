import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PublicLayout from "./Components/Layout/PublicLayout";
import { isCrmHost, normalizeLegacyAdminPath, CRM_ORIGIN } from "./admin/utils/adminPaths";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const AdminLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
  </div>
);

function LegacyAdminRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = normalizeLegacyAdminPath(pathname);
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

function RedirectToCrmSubdomain() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const target = normalizeLegacyAdminPath(pathname);
    window.location.replace(`${CRM_ORIGIN}${target}${search}${hash}`);
  }, [pathname, search, hash]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
    </div>
  );
}

function App() {
  const crmHost = isCrmHost();

  return (
    <Suspense fallback={<AdminLoader />}>
      <Routes>
        {crmHost ? (
          <>
            <Route path="/admin-panel/*" element={<LegacyAdminRedirect />} />
            <Route path="/*" element={<AdminApp />} />
          </>
        ) : (
          <>
            <Route path="/admin-panel/*" element={<RedirectToCrmSubdomain />} />
            <Route path="/*" element={<PublicLayout />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}

export default App;
