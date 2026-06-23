import { useEffect, useState } from "react";

export default function BlogTableOfContents({ headings }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!headings.length) return undefined;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav className="blog-sidebar-widget" aria-label="Table of contents">
      <h2 className="blog-sidebar-title">On this page</h2>
      <ul className="blog-toc-list">
        {headings.map((h) => (
          <li key={h.id} className={h.level === "h3" ? "blog-toc-item blog-toc-item--nested" : "blog-toc-item"}>
            <button
              type="button"
              onClick={() => scrollTo(h.id)}
              className={`blog-toc-link ${activeId === h.id ? "is-active" : ""}`}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
