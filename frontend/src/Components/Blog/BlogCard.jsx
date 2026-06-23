import { Link } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { imageKitUrl } from "../../utils/imageKit";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function BlogCard({ blog, featured = false }) {
  const img = blog.featuredImage?.url;

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg transition hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-xl ${
        featured ? "sm:flex-row sm:items-stretch" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-[#0d1224] ${
          featured ? "aspect-[16/10] sm:aspect-auto sm:w-2/5 sm:min-h-[220px]" : "aspect-[16/10]"
        }`}
      >
        {img ? (
          <img
            src={imageKitUrl(img, featured ? 800 : 600)}
            alt={blog.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-gray-500">
            No image
          </div>
        )}
        {blog.categoryId?.name && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {blog.categoryId.name}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col p-5 md:p-6 ${featured ? "sm:justify-center" : ""}`}>
        <h2
          className={`font-[dual] font-semibold leading-snug text-white group-hover:text-blue-200 ${
            featured ? "text-2xl md:text-3xl" : "text-xl"
          }`}
        >
          {blog.title}
        </h2>
        {blog.excerpt && (
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-400 md:text-base">
            {blog.excerpt}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 md:text-sm">
          <span className="flex items-center gap-1">
            <User size={14} /> {blog.author}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} /> {blog.readingTime} min read
          </span>
          <span>{formatDate(blog.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
