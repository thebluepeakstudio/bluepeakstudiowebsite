import { useLocation } from "react-router-dom";
import PageMeta from "./PageMeta";
import { getSeoForPath } from "../../config/seo";

const SKIP_PATHS = ["/blogs"];

export default function SeoRouteHandler() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/blogs/") || SKIP_PATHS.includes(pathname)) {
    return null;
  }

  const seo = getSeoForPath(pathname);
  if (!seo) return null;

  return (
    <PageMeta
      title={seo.title}
      description={seo.description}
      keywords={seo.keywords}
      path={pathname}
      noSuffix={seo.noSuffix}
      noindex={seo.noindex}
    />
  );
}
