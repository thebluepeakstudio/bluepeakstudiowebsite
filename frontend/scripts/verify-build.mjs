import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("[verify-build] dist/index.html not found — build may have failed");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const refs = [...html.matchAll(/\/assets\/([^"'\s>]+)/g)].map((m) => m[1]);
const missing = refs.filter((ref) => !fs.existsSync(path.join(distDir, "assets", ref)));

if (missing.length) {
  console.error("[verify-build] index.html references missing assets:");
  missing.forEach((f) => console.error(`  - assets/${f}`));
  process.exit(1);
}

const assetCount = fs.readdirSync(path.join(distDir, "assets")).length;
console.log(`[verify-build] OK — ${refs.length} referenced assets, ${assetCount} files in dist/assets`);
