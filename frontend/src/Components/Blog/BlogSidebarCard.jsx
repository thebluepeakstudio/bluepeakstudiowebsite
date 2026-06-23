import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { imageKitUrl } from "../../utils/imageKit";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function BlogSidebarCard({ blog }) {
  const img = blog.featuredImage?.url;

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="blog-sidebar-card group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-500/25 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-blue-500/5"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#0d1224]">
        {img ? (
          <img
            src={imageKitUrl(img, 160)}
            alt={blog.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-gray-500">BPS</div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {blog.categoryId?.name && (
          <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-blue-300/90">
            {blog.categoryId.name}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white transition group-hover:text-blue-100">
          {blog.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-0.5">
            <Clock size={11} /> {blog.readingTime} min
          </span>
          <span>{formatDate(blog.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
