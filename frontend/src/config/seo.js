export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://bluepeakstudio.in").replace(/\/$/, "");

export const SITE_NAME = "BluePeak Studio";

export const DEFAULT_DESCRIPTION =
  "BluePeak Studio builds high-performance websites and custom software — admin panels, CRMs, booking apps, and business dashboards for growing companies in India.";

export const DEFAULT_OG_IMAGE =
  "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/BPS.png?updatedAt=1773667763921";

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  email: "thebluepeakstudio@gmail.com",
  phone: "+91-9378173053",
  sameAs: [
    "https://www.instagram.com/bluepeakstudio.in",
    "https://www.linkedin.com/company/bluepeak-studio",
  ],
};

export const ROUTE_SEO = {
  "/": {
    title: "BluePeak Studio — Websites & Custom Software Development",
    description:
      "BluePeak Studio designs and builds high-performance websites, admin panels, CRMs, booking apps, and custom business software. Based in India, serving growing companies worldwide.",
    keywords:
      "web development, custom software, admin panel, CRM development, business website, BluePeak Studio, India",
    noSuffix: true,
  },
  "/services": {
    title: "Web Development & Custom Software Services",
    description:
      "Website design, custom admin panels, CRMs, booking systems, and business dashboards — end-to-end development from BluePeak Studio.",
    keywords:
      "web development services, custom software development, admin panel, CRM, booking app, business dashboard",
  },
  "/projects": {
    title: "Our Work — Web & Software Projects",
    description:
      "Explore websites and custom software built by BluePeak Studio — from marketing sites to admin panels and business tools.",
    keywords: "web design portfolio, software projects, BluePeak Studio work, case studies",
  },
  "/about-us": {
    title: "About BluePeak Studio",
    description:
      "Meet BluePeak Studio — a team focused on building fast, reliable websites and custom software that helps businesses grow.",
    keywords: "about BluePeak Studio, web development team, custom software company India",
  },
  "/contact": {
    title: "Contact Us — Start Your Project",
    description:
      "Get in touch with BluePeak Studio for websites, admin panels, CRMs, and custom software. We respond within 24 hours.",
    keywords: "contact BluePeak Studio, hire web developer, custom software quote",
  },
  "/blogs": {
    title: "Blog — Insights on Web & Software",
    description:
      "Practical guides on websites, custom software, SEO, and growing your business with technology — from BluePeak Studio.",
    keywords: "web development blog, custom software tips, business technology, BluePeak Studio blog",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description: "How BluePeak Studio collects, uses, and protects your personal information.",
    keywords: "privacy policy, BluePeak Studio",
  },
  "/testimonial": {
    title: "Share Your Experience",
    description: "Submit a testimonial about your experience working with BluePeak Studio.",
    noindex: true,
  },
};

export function getSeoForPath(pathname) {
  return ROUTE_SEO[pathname] || null;
}

export function buildBreadcrumbs(items) {
  return items.map((item, index) => ({
    name: item.name,
    path: item.path,
    position: index + 1,
  }));
}
