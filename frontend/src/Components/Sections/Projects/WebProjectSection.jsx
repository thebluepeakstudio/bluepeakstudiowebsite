import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { getPublishedProjects } from "../../../api/website.api";
import { hasCaseStudyContent } from "../../../types/website";
import "./Project.css";

export default function WebProjectSection() {
  const [active, setActive] = useState("All");
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState(["All"]);
  const [visible, setVisible] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getPublishedProjects()
      .then((res) => {
        if (cancelled) return;
        const list = res.data || [];
        setProjects(list);
        setFilters(
          res.filters?.length
            ? res.filters
            : ["All", ...new Set(list.map((p) => p.category).filter(Boolean))]
        );
        setVisible(list);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          setVisible([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const filtered =
      active === "All" ? projects : projects.filter((p) => p.category === active);
    setVisible(filtered);
  }, [active, projects]);

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

  if (loading) {
    return (
      <section className="port-container" id="portfolio">
        <div className="port-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="port-card" style={{ opacity: 1, transform: "none" }}>
              <div className="port-card-inner animate-pulse">
                <div className="port-image-container bg-slate-100" />
                <div className="port-content space-y-3">
                  <div className="h-3 w-24 rounded bg-slate-100" />
                  <div className="h-5 w-3/4 rounded bg-slate-100" />
                  <div className="h-12 w-full rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

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
          <div key={p._id || p.slug || p.title} className="port-card" data-pcard>
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
