import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { projects, filters } from "../../../data/projects";
import { hasCaseStudyContent } from "../../../types/website";
import "./Project.css";

export default function WebProjectSection() {
  const [active, setActive] = useState("All");
  const [visible, setVisible] = useState(projects);
  const containerRef = useRef(null);

  useEffect(() => {
    const filtered =
      active === "All" ? projects : projects.filter((p) => p.category === active);
    setVisible(filtered);
  }, [active]);

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll("[data-pcard]");
    if (!cards) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = "1";
            e.target.style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [visible]);

  const showCaseStudy = (p) => hasCaseStudyContent(p.caseStudy) && p.slug;
  const hasDemo = (p) => p.link && p.link !== "#";

  return (
    <section className="port-container" id="portfolio">
      <div className="port-header">
        <div className="port-filters">
          {filters.map((f) => (
            <button
              key={f}
              className={`port-filter-btn ${active === f ? "active" : ""}`}
              onClick={() => setActive(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="port-grid" ref={containerRef}>
        {visible.map((p) => (
          <div key={p.slug || p.title} className="port-card" data-pcard>
            <div className="port-card-inner">
              <div className="port-image-container">
                <img src={p.img} alt={p.title} />
                <div className="port-overlay">
                  {showCaseStudy(p) ? (
                    <div className="port-overlay-actions">
                      <Link to={`/projects/case-study/${p.slug}`} className="port-view-btn">
                        Case Study
                      </Link>
                      {hasDemo(p) && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="port-view-btn port-demo-btn"
                        >
                          <Play size={14} />
                          Demo
                        </a>
                      )}
                    </div>
                  ) : hasDemo(p) ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="port-view-btn"
                    >
                      View
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="port-content">
                <div className="port-meta">
                  <span className="port-category">{p.category}</span>
                  <div className="port-line" style={{ backgroundColor: p.color }} />
                </div>
                <h3 className="port-card-title">{p.title}</h3>
                <p className="port-card-desc">{p.desc}</p>

                <div className="port-tags">
                  {(p.tags || []).map((tag) => (
                    <span key={tag} className="port-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                {showCaseStudy(p) && (
                  <div className="port-card-actions">
                    <Link
                      to={`/projects/case-study/${p.slug}`}
                      className="port-action-btn port-action-primary"
                    >
                      Case Study
                    </Link>
                    {hasDemo(p) && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="port-action-btn port-action-secondary"
                      >
                        <Play size={14} />
                        Demo Video
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
