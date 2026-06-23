import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../Components/SEO/PageMeta";
import { buildBreadcrumbs } from "../config/seo";
import BlogCard from "../Components/Blog/BlogCard";
import {
  getPublishedBlogs,
  getFeaturedBlogs,
  getBlogCategories,
} from "../api/blog.api";

export default function Blogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    getFeaturedBlogs(3)
      .then((res) => setFeatured(res.data || []))
      .catch(() => {});
    getBlogCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getPublishedBlogs({ page, limit: 9, search: search || undefined, category: category || undefined })
      .then((res) => {
        setBlogs(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1 });
      })
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, [page, search, category]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    if (!updates.page) next.set("page", "1");
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim(), page: "1" });
  };

  return (
    <>
      <PageMeta
        title="Blog — Insights on Web & Software"
        description="Practical guides on websites, custom software, SEO, and growing your business with technology — from BluePeak Studio."
        keywords="web development blog, custom software tips, business technology, BluePeak Studio blog"
        path="/blogs"
        breadcrumbs={buildBreadcrumbs([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blogs" },
        ])}
      />

      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-24 md:pt-28">
        <div className="mb-12 text-center md:text-left">
          <h1 className="font-[azonix] text-4xl font-bold md:text-5xl">Insights & Updates</h1>
          <p className="dm-sans mt-4 max-w-2xl text-lg text-gray-400">
            Practical guides on websites, custom software, and building tools that run your business.
          </p>
        </div>

        {featured.length > 0 && !search && !category && page === 1 && (
          <section className="mb-16">
            <h2 className="mb-6 font-[dual] text-2xl text-white">Featured</h2>
            <div className="grid gap-6">
              {featured.slice(0, 1).map((blog) => (
                <BlogCard key={blog._id} blog={blog} featured />
              ))}
              {featured.length > 1 && (
                <div className="grid gap-6 sm:grid-cols-2">
                  {featured.slice(1).map((blog) => (
                    <BlogCard key={blog._id} blog={blog} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles..."
              className="dm-sans flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateParams({ category: "", page: "1" })}
              className={`rounded-full px-4 py-2 text-sm transition ${
                !category ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => updateParams({ category: cat.slug, page: "1" })}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  category === cat.slug
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <section>
          <h2 className="mb-6 font-[dual] text-2xl text-white">
            {search ? `Results for "${search}"` : category ? "Filtered articles" : "Latest articles"}
          </h2>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-400">
              No articles found. Check back soon.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog._id} blog={blog} />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
