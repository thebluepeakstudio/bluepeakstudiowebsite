import BlogSidebarCard from "./BlogSidebarCard";

export default function BlogSidebar({ related = [] }) {
  if (!related.length) return null;

  return (
    <aside className="blog-post-sidebar" aria-label="Related articles">
      <div className="blog-post-sidebar-inner">
        <section className="blog-sidebar-widget">
          <h2 className="blog-sidebar-title">Related articles</h2>
          <div className="blog-sidebar-cards blog-sidebar-cards--related">
            {related.map((blog) => (
              <BlogSidebarCard key={blog._id} blog={blog} />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
