import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const backendUrl = (process.env.VITE_BACKEND_URL || "http://localhost:10000").replace(/\/$/, "");

async function fetchAndWrite(endpoint, filename) {
  const url = `${backendUrl}${endpoint}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    fs.writeFileSync(path.join(distDir, filename), body, "utf8");
    console.log(`[seo] Wrote ${filename} from ${url}`);
  } catch (err) {
    console.warn(`[seo] Could not fetch ${endpoint}: ${err.message}`);
    if (endpoint === "/robots.txt" && fs.existsSync(path.join(__dirname, "..", "public", "robots.txt"))) {
      fs.copyFileSync(
        path.join(__dirname, "..", "public", "robots.txt"),
        path.join(distDir, "robots.txt")
      );
      console.log("[seo] Copied robots.txt from public/");
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.warn("[seo] dist/ not found — run vite build first");
  process.exit(0);
}

await fetchAndWrite("/sitemap.xml", "sitemap.xml");
await fetchAndWrite("/robots.txt", "robots.txt");
await fetchAndWrite("/rss.xml", "rss.xml");
