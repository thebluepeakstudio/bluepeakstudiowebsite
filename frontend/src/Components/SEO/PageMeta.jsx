import { Helmet } from "react-helmet-async";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  ORGANIZATION,
} from "../../config/seo";

function buildTitle(title, noSuffix) {
  const fallback = `${SITE_NAME} — Websites & Custom Software`;
  if (!title) return fallback;
  if (noSuffix) return title;
  return `${title} | ${SITE_NAME}`;
}

function buildSchemas({ title, desc, url, ogImage, article, breadcrumbs, type }) {
  const schemas = [];

  if (breadcrumbs?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item) => ({
        "@type": "ListItem",
        position: item.position,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    });
  }

  if (article) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: desc,
      image: ogImage,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      author: {
        "@type": "Person",
        name: article.author || SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: {
          "@type": "ImageObject",
          url: ORGANIZATION.logo,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      ...(article.category ? { articleSection: article.category } : {}),
      ...(article.tags?.length ? { keywords: article.tags.join(", ") } : {}),
    });
  }

  if (type === "website" && !article) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: desc,
      url,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
    });
  }

  return schemas;
}

export default function PageMeta({
  title,
  description,
  path = "",
  image,
  type = "website",
  article,
  keywords,
  breadcrumbs,
  noindex = false,
  noSuffix = false,
}) {
  const fullTitle = buildTitle(title, noSuffix);
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const ogImage = image || DEFAULT_OG_IMAGE;
  const robots = noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

  const schemas = buildSchemas({
    title: title || SITE_NAME,
    desc,
    url,
    ogImage,
    article,
    breadcrumbs,
    type,
  });

  return (
    <Helmet>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />

      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {article?.publishedAt && (
        <meta property="article:published_time" content={article.publishedAt} />
      )}
      {article?.updatedAt && (
        <meta property="article:modified_time" content={article.updatedAt} />
      )}
      {article?.author && <meta property="article:author" content={article.author} />}

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
