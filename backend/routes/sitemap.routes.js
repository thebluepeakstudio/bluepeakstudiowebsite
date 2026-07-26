const express = require("express");
const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const { publishedBlogFilter } = require("../utils/publishedBlogFilter");

/** Case study slugs from frontend/src/data/projects.js (static marketing content). */
const CASE_STUDY_SLUGS = [
  "client-management-system",
  "inventory-management-system",
  "foxnut-manufacturing-erp",
];

const router = express.Router();

const siteUrl = () =>
  (process.env.SITE_URL || process.env.FRONTEND_URL || "https://bluepeakstudio.in").replace(/\/$/, "");

const escapeXml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const publishedFilter = publishedBlogFilter();

router.get("/robots.txt", (req, res) => {
  const base = siteUrl();
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Disallow: /admin-panel/

Sitemap: ${base}/sitemap.xml
`);
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = siteUrl();
    const staticPages = [
      { path: "", priority: "1.0", changefreq: "weekly" },
      { path: "/services", priority: "0.9", changefreq: "monthly" },
      { path: "/projects", priority: "0.8", changefreq: "monthly" },
      { path: "/about-us", priority: "0.8", changefreq: "monthly" },
      { path: "/contact", priority: "0.8", changefreq: "monthly" },
      { path: "/blogs", priority: "0.9", changefreq: "daily" },
      { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    ];

    const [blogs, categories, blogCount] = await Promise.all([
      Blog.find(publishedFilter).select("slug updatedAt publishedAt").sort({ publishedAt: -1 }).lean(),
      BlogCategory.find({}).select("slug updatedAt").lean(),
      Blog.countDocuments(publishedFilter),
    ]);

    const blogPages = Math.ceil(blogCount / 9);
    const today = new Date().toISOString().split("T")[0];
    const paginationUrls = Array.from({ length: Math.max(0, blogPages - 1) }, (_, i) => ({
      loc: `${base}/blogs?page=${i + 2}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.5",
    }));

    const caseStudyPages = CASE_STUDY_SLUGS.map((slug) => ({
      loc: `${base}/projects/case-study/${slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    }));

    const urls = [
      ...staticPages.map(({ path, priority, changefreq }) => ({
        loc: `${base}${path}`,
        lastmod: new Date().toISOString().split("T")[0],
        changefreq,
        priority,
      })),
      ...caseStudyPages,
      ...categories.map((cat) => ({
        loc: `${base}/blogs?category=${cat.slug}`,
        lastmod: (cat.updatedAt || new Date()).toISOString().split("T")[0],
        changefreq: "weekly",
        priority: "0.6",
      })),
      ...paginationUrls,
      ...blogs.map((b) => ({
        loc: `${base}/blogs/${b.slug}`,
        lastmod: (b.updatedAt || b.publishedAt || new Date()).toISOString().split("T")[0],
        changefreq: "monthly",
        priority: "0.7",
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch {
    res.status(500).send("Sitemap generation failed");
  }
});

router.get("/rss.xml", async (req, res) => {
  try {
    const base = siteUrl();
    const blogs = await Blog.find(publishedFilter)
      .select("title slug excerpt content publishedAt author")
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    const items = blogs
      .map((b) => {
        const link = `${base}/blogs/${b.slug}`;
        const pubDate = new Date(b.publishedAt).toUTCString();
        const description = escapeXml(b.excerpt || "");
        return `    <item>
      <title>${escapeXml(b.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(b.author || "BluePeak Studio")}</author>
      <description>${description}</description>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BluePeak Studio Blog</title>
    <link>${base}/blogs</link>
    <description>Insights on websites, custom software, and business technology from BluePeak Studio.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    res.header("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(xml);
  } catch {
    res.status(500).send("RSS feed generation failed");
  }
});

module.exports = router;
