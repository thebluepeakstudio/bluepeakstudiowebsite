import { SITE_NAME } from "../../../config/seo";

function CharCount({ value, max, label }) {
  const len = (value || "").length;
  const over = len > max;
  return (
    <p className={`mt-1 text-right text-xs ${over ? "text-red-600" : "text-admin-textMuted"}`}>
      {label}: {len}/{max}
    </p>
  );
}

export default function SeoPreview({ title, seoTitle, excerpt, seoDescription, slug, featuredImageUrl }) {
  const displayTitle = seoTitle || title || "Blog post title";
  const displayDesc = seoDescription || excerpt || "Add a meta description to improve click-through from search results.";
  const url = slug ? `bluepeakstudio.in/blogs/${slug}` : "bluepeakstudio.in/blogs/your-post-slug";

  return (
    <div className="rounded-2xl border border-admin-border/80 bg-slate-50/80 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-textMuted">
        Google search preview
      </p>
      <div className="rounded-xl border border-admin-border bg-white p-4 shadow-sm">
        <p className="truncate text-sm text-emerald-700">{url}</p>
        <p className="mt-1 line-clamp-2 text-lg text-blue-700">
          {displayTitle}
          {!seoTitle && title ? ` | ${SITE_NAME}` : !seoTitle ? ` | ${SITE_NAME}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-admin-textMuted">{displayDesc}</p>
      </div>

      {featuredImageUrl && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-admin-textMuted">Social share image</p>
          <img
            src={featuredImageUrl}
            alt="Featured preview"
            className="h-32 w-full rounded-lg border border-admin-border object-cover"
          />
        </div>
      )}

      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        <CharCount value={displayTitle} max={60} label="Title" />
        <CharCount value={displayDesc} max={160} label="Description" />
      </div>
    </div>
  );
}
