import { Link } from "react-router-dom";
import BlogSidebarCard from "./BlogSidebarCard";
import BlogTableOfContents from "./BlogTableOfContents";

export default function BlogSidebar({ headings, recommended = [], categories = [] }) {
  return (
    <aside className="blog-post-sidebar" aria-label="Blog sidebar">
      <div className="blog-post-sidebar-inner">
        <BlogTableOfContents headings={headings} />

        {recommended.length > 0 && (
          <section className="blog-sidebar-widget">
            <h2 className="blog-sidebar-title">Recommended</h2>
            <div className="blog-sidebar-cards">
              {recommended.map((blog) => (
                <BlogSidebarCard key={blog._id} blog={blog} />
              ))}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="blog-sidebar-widget">
            <h2 className="blog-sidebar-title">Categories</h2>
            <ul className="blog-sidebar-categories">
              {categories.map((cat) => (
                <li key={cat._id}>
                  <Link to={`/blogs?category=${cat.slug}`} className="blog-sidebar-category">
                    <span>{cat.name}</span>
                    <span className="blog-sidebar-category-count">{cat.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
