import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import PageMeta from "../Components/SEO/PageMeta";
import PageContent from "../Components/Layout/PageContent";
import { buildBreadcrumbs } from "../config/seo";
import { getPublishedProjectBySlug, getEmbedUrl } from "../api/website.api";
import { hasCaseStudyContent } from "../types/website";
import "../Components/CaseStudy/case-study.css";

export default function CaseStudy() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublishedProjectBySlug(slug)
      .then((res) => {
        if (cancelled) return;
        const item = res.data;
        if (!item || !hasCaseStudyContent(item.caseStudy)) {
          setNotFound(true);
          return;
        }
        setProject(item);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <PageContent className="case-study-page page-top">
        <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-8 h-10 w-2/3 max-w-lg animate-pulse rounded bg-white/10" />
        <div className="mt-6 aspect-video animate-pulse rounded-2xl bg-white/5" />
      </PageContent>
    );
  }

  if (notFound || !project) {
    return <Navigate to="/projects" replace />;
  }

  const { caseStudy } = project;
  const embedUrl = getEmbedUrl(project.link);
  const hasDemo = project.link && project.link !== "#";
  const tags = project.tags || [];
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: `/projects/case-study/${project.slug}` },
  ]);

  return (
    <>
      <PageMeta
        title={`${project.title} — Case Study`}
        description={caseStudy.overview || project.desc}
        path={`/projects/case-study/${project.slug}`}
        image={project.img}
        keywords={`${project.title}, custom software case study, BluePeak Studio, ${tags.join(", ")}`}
        breadcrumbs={breadcrumbs}
      />

      <PageContent className="case-study-page page-top">
        <Link to="/projects" className="case-study-back">
          <ArrowLeft size={16} />
          Back to Projects
        </Link>

        <header className="case-study-hero">
          <div className="case-study-meta">
            <span className="case-study-category">{project.category}</span>
            <span className="case-study-accent" style={{ backgroundColor: project.color }} />
          </div>
          <h1 className="case-study-title">{project.title}</h1>
          <div className="case-study-tags">
            {tags.map((tag) => (
              <span key={tag} className="case-study-tag">
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="case-study-cover">
          <img src={project.img} alt={project.title} />
        </div>

        <div className="case-study-grid">
          <div className="case-study-main">
            {caseStudy.overview && (
              <section className="case-study-section">
                <h2 className="case-study-section-title">Overview</h2>
                <p className="case-study-section-body">{caseStudy.overview}</p>
              </section>
            )}

            {caseStudy.problem && (
              <section className="case-study-section">
                <h2 className="case-study-section-title">The Problem</h2>
                <p className="case-study-section-body">{caseStudy.problem}</p>
              </section>
            )}

            {caseStudy.solution && (
              <section className="case-study-section">
                <h2 className="case-study-section-title">How We Solved It</h2>
                <p className="case-study-section-body">{caseStudy.solution}</p>
              </section>
            )}

            {caseStudy.highlights?.length > 0 && (
              <section className="case-study-section">
                <h2 className="case-study-section-title">Key Outcomes</h2>
                <ul className="case-study-highlights">
                  {caseStudy.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {hasDemo && embedUrl && (
              <section className="case-study-section case-study-video">
                <h2 className="case-study-section-title">Demo Video</h2>
                <div className="case-study-video-frame">
                  <iframe
                    src={embedUrl}
                    title={`${project.title} demo`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}
          </div>

          <aside className="case-study-sidebar">
            <div className="case-study-sidebar-inner">
              {hasDemo && (
                <div className="case-study-widget">
                  <p className="case-study-widget-title">Product Demo</p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="case-study-demo-btn"
                  >
                    <Play size={16} />
                    Watch Demo Video
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="case-study-widget">
                <p className="case-study-widget-title">Tech Stack</p>
                <div className="case-study-tags">
                  {tags.map((tag) => (
                    <span key={tag} className="case-study-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="case-study-cta">
          <p>Need custom software built for your business?</p>
          <Link to="/contact" className="case-study-cta-link">
            Start a Project
            <ArrowLeft size={16} className="rotate-180" />
          </Link>
        </div>
      </PageContent>
    </>
  );
}
