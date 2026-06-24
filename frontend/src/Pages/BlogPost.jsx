import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, User, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import PageMeta from "../Components/SEO/PageMeta";
import PageContent from "../Components/Layout/PageContent";
import { buildBreadcrumbs } from "../config/seo";
import BlogContent from "../Components/Blog/BlogContent";
import BlogSidebar from "../Components/Blog/BlogSidebar";
import { getBlogBySlug } from "../api/blog.api";
import { imageKitUrl } from "../utils/imageKit";
import "../Components/Blog/blog-post.css";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getBlogBySlug(slug)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const share = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(data?.blog?.title || "");
    const links = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    if (links[platform]) window.open(links[platform], "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <PageContent className="page-top pb-16">
        <div className="blog-post-grid">
          <div className="blog-post-main">
            <div className="h-8 w-2/3 max-w-lg animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white/5" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    );
  }

  if (error || !data?.blog) {
    return (
      <>
        <PageMeta
          title="Article Not Found"
          description="This blog post may have been removed or is not published yet."
          path={`/blogs/${slug}`}
          noindex
        />
        <PageContent className="page-top pb-32 text-center">
          <h1 className="dm-sans text-2xl font-semibold text-white sm:text-3xl">Article not found</h1>
          <p className="mt-4 text-gray-400">This post may have been removed or is not published yet.</p>
          <Link to="/blogs" className="mt-6 inline-block text-blue-400 hover:underline">
            Back to blog
          </Link>
        </PageContent>
      </>
    );
  }

  const { blog, navigation, related = [] } = data;
  const metaTitle = blog.seoTitle || blog.title;
  const metaDesc = blog.seoDescription || blog.excerpt;
  const metaKeywords =
    blog.seoKeywords || (blog.tags || []).join(", ") || blog.categoryId?.name || "";

  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blogs" },
    ...(blog.categoryId?.name
      ? [{ name: blog.categoryId.name, path: `/blogs?category=${blog.categoryId.slug}` }]
      : []),
    { name: blog.title, path: `/blogs/${blog.slug}` },
  ]);

  return (
    <>
      <PageMeta
        title={metaTitle}
        description={metaDesc}
        path={`/blogs/${blog.slug}`}
        image={blog.featuredImage?.url}
        type="article"
        keywords={metaKeywords}
        breadcrumbs={breadcrumbs}
        article={{
          publishedAt: blog.publishedAt,
          updatedAt: blog.updatedAt,
          author: blog.author,
          category: blog.categoryId?.name,
          tags: blog.tags,
        }}
      />

      <PageContent className="page-top pb-16">
        <div className="blog-post-grid">
          <article className="blog-post-main" itemScope itemType="https://schema.org/BlogPosting">
            <nav
              aria-label="Breadcrumb"
              className="mb-6 flex flex-wrap items-center gap-1 text-xs text-gray-500"
            >
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <span>/</span>
              <Link to="/blogs" className="hover:text-white">
                Blog
              </Link>
              {blog.categoryId?.name && (
                <>
                  <span>/</span>
                  <Link to={`/blogs?category=${blog.categoryId.slug}`} className="hover:text-white">
                    {blog.categoryId.name}
                  </Link>
                </>
              )}
            </nav>

            <button
              type="button"
              onClick={() => navigate("/blogs")}
              className="mb-8 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft size={16} /> Back to blog
            </button>

            {blog.categoryId?.name && (
              <Link
                to={`/blogs?category=${blog.categoryId.slug}`}
                className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/30"
              >
                {blog.categoryId.name}
              </Link>
            )}

            <h1
              className="blog-post-title dm-sans mt-4 text-2xl font-semibold leading-snug text-white sm:text-3xl md:text-4xl"
              itemProp="headline"
            >
              {blog.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5" itemProp="author">
                <User size={16} /> {blog.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} /> {blog.readingTime} min read
              </span>
              <time dateTime={blog.publishedAt} itemProp="datePublished">
                {formatDate(blog.publishedAt)}
              </time>
            </div>

            {blog.featuredImage?.url && (
              <img
                src={imageKitUrl(blog.featuredImage.url, 1200)}
                alt={blog.title}
                className="mt-8 max-h-[420px] w-full rounded-2xl border border-white/10 object-cover"
                fetchPriority="high"
                itemProp="image"
              />
            )}

            {blog.excerpt && (
              <p className="dm-sans mt-8 text-lg leading-relaxed text-gray-300 md:text-xl" itemProp="description">
                {blog.excerpt}
              </p>
            )}

            <div className="mt-10" itemProp="articleBody">
              <BlogContent html={blog.content} />
            </div>

            {blog.galleryImages?.length > 0 && (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {blog.galleryImages.map((img) => (
                  <img
                    key={img.publicId || img._id}
                    src={imageKitUrl(img.url, 800)}
                    alt={img.alt || blog.title}
                    className="h-48 w-full rounded-xl border border-white/10 object-cover sm:h-56"
                    loading="lazy"
                  />
                ))}
              </div>
            )}

            {blog.tags?.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
              <Share2 size={18} className="text-gray-400" />
              <span className="text-sm text-gray-400">Share:</span>
              <button
                type="button"
                onClick={() => share("twitter")}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
              >
                Twitter
              </button>
              <button
                type="button"
                onClick={() => share("linkedin")}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
              >
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => share("facebook")}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
              >
                Copy link
              </button>
            </div>

            <div className="blog-author-card">
              <p className="blog-author-label">Written by</p>
              <p className="blog-author-name">{blog.author}</p>
              <p className="blog-author-bio">
                Insights on web development, custom software, and building digital products that help
                businesses grow — from the team at BluePeak Studio.
              </p>
            </div>

            <nav
              className="mt-10 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2"
              aria-label="Post navigation"
            >
              {navigation?.prev ? (
                <Link
                  to={`/blogs/${navigation.prev.slug}`}
                  className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-500/30"
                  rel="prev"
                >
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <ChevronLeft size={14} /> Previous
                  </span>
                  <span className="mt-1 block font-medium text-white group-hover:text-blue-200">
                    {navigation.prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {navigation?.next && (
                <Link
                  to={`/blogs/${navigation.next.slug}`}
                  className="group rounded-xl border border-white/10 bg-white/5 p-4 text-right transition hover:border-blue-500/30 sm:col-start-2"
                  rel="next"
                >
                  <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
                    Next <ChevronRight size={14} />
                  </span>
                  <span className="mt-1 block font-medium text-white group-hover:text-blue-200">
                    {navigation.next.title}
                  </span>
                </Link>
              )}
            </nav>
          </article>

          <BlogSidebar related={related} />
        </div>
      </PageContent>
    </>
  );
}
