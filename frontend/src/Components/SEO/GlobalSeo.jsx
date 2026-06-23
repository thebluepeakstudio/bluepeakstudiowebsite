import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, ORGANIZATION } from "../../config/seo";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: ORGANIZATION.name,
  url: ORGANIZATION.url,
  logo: ORGANIZATION.logo,
  email: ORGANIZATION.email,
  telephone: ORGANIZATION.phone,
  sameAs: ORGANIZATION.sameAs,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: ORGANIZATION.logo,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/blogs?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function GlobalSeo() {
  return (
    <Helmet>
      <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} Blog`} href={`${SITE_URL}/rss.xml`} />
      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
    </Helmet>
  );
}
