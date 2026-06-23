import { useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import "../../blog-prose.css";

function slugifyHeading(text, index) {
  return (
    String(text || "section")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `section-${index}`
  );
}

function enrichHtml(html) {
  const clean = DOMPurify.sanitize(html || "", {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "rel", "id"],
  });

  if (typeof document === "undefined") {
    return { html: clean, headings: [] };
  }

  const container = document.createElement("div");
  container.innerHTML = clean;

  const headings = [];
  const usedIds = new Set();

  container.querySelectorAll("h2, h3").forEach((el, index) => {
    let id = slugifyHeading(el.textContent, index);
    while (usedIds.has(id)) {
      id = `${id}-${index}`;
    }
    usedIds.add(id);
    el.id = id;
    headings.push({
      id,
      text: el.textContent?.trim() || "",
      level: el.tagName.toLowerCase(),
    });
  });

  return { html: container.innerHTML, headings };
}

export default function BlogContent({ html, onHeadingsChange, contentRef }) {
  const { html: enriched, headings } = useMemo(() => enrichHtml(html), [html]);
  const innerRef = useRef(null);

  useEffect(() => {
    onHeadingsChange?.(headings);
  }, [headings, onHeadingsChange]);

  useEffect(() => {
    if (contentRef && innerRef.current) {
      contentRef.current = innerRef.current;
    }
  }, [contentRef, enriched]);

  return (
    <div
      ref={innerRef}
      className="blog-prose dm-sans"
      dangerouslySetInnerHTML={{ __html: enriched }}
    />
  );
}
