import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

function verifyHtml(label, filename) {
  const htmlPath = path.join(distDir, filename);
  if (!fs.existsSync(htmlPath)) {
    console.error(`[verify-build] dist/${filename} not found — build may have failed`);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const refs = [...html.matchAll(/\/assets\/([^"'\s>]+)/g)].map((m) => m[1]);
  const missing = refs.filter((ref) => !fs.existsSync(path.join(distDir, "assets", ref)));

  if (missing.length) {
    console.error(`[verify-build] ${label} references missing assets:`);
    missing.forEach((f) => console.error(`  - assets/${f}`));
    process.exit(1);
  }

  return refs.length;
}

const indexAssets = verifyHtml("index.html", "index.html");
const crmAssets = verifyHtml("crm.html", "crm.html");
const assetCount = fs.readdirSync(path.join(distDir, "assets")).length;

console.log(
  `[verify-build] OK — index.html: ${indexAssets} assets, crm.html: ${crmAssets} assets, ${assetCount} total in dist/assets`
);
