import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import PublicLayout from "./Components/Layout/PublicLayout";
import { normalizeLegacyAdminPath, CRM_ORIGIN } from "./admin/utils/adminPaths";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const AdminLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
  </div>
);

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

/** Marketing website. In dev, CRM is mounted at /admin-panel. */
export default function App() {
  return (
    <Suspense fallback={<AdminLoader />}>
      <Routes>
        {import.meta.env.DEV ? (
          <>
            <Route path="/admin-panel/*" element={<AdminApp />} />
            <Route path="/*" element={<PublicLayout />} />
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
