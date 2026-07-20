import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import PageMeta from "../Components/SEO/PageMeta";
import PageContent from "../Components/Layout/PageContent";
import { buildBreadcrumbs } from "../config/seo";
import { getCaseStudyBySlug, getEmbedUrl } from "../data/projects";
import "../Components/CaseStudy/case-study.css";

export default function CaseStudy() {
  const { slug } = useParams();
  const project = getCaseStudyBySlug(slug);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const { caseStudy } = project;
  const embedUrl = getEmbedUrl(project.link);
  const hasDemo = project.link && project.link !== "#";
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: `/projects/case-study/${project.slug}` },
  ]);

  return (
    <>
      <PageMeta
        title={`${project.title} — Case Study`}
        description={caseStudy.overview}
        path={`/projects/case-study/${project.slug}`}
        image={project.img}
        keywords={`${project.title}, custom software case study, BluePeak Studio, ${project.tags.join(", ")}`}
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
            {project.tags.map((tag) => (
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
            <section className="case-study-section">
              <h2 className="case-study-section-title">Overview</h2>
              <p className="case-study-section-body">{caseStudy.overview}</p>
            </section>

            <section className="case-study-section">
              <h2 className="case-study-section-title">The Problem</h2>
              <p className="case-study-section-body">{caseStudy.problem}</p>
            </section>

            <section className="case-study-section">
              <h2 className="case-study-section-title">How We Solved It</h2>
              <p className="case-study-section-body">{caseStudy.solution}</p>
            </section>

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
                  {project.tags.map((tag) => (
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
