import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([".git", "netlify", "node_modules", "scripts", "tmp"]);

async function findPublicHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;

    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findPublicHtmlFiles(fullPath)));
    } else if (extname(entry.name) === ".html") {
      files.push(fullPath);
    }
  }

  return files;
}

function hasMeta(html, attribute, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const firstOrder = new RegExp(
    `<meta\\s+[^>]*${attribute}=["']${escapedValue}["'][^>]*content=["']https:\\/\\/[^"']+["'][^>]*>`,
    "i",
  );
  const reverseOrder = new RegExp(
    `<meta\\s+[^>]*content=["']https:\\/\\/[^"']+["'][^>]*${attribute}=["']${escapedValue}["'][^>]*>`,
    "i",
  );
  return firstOrder.test(html) || reverseOrder.test(html);
}

const htmlFiles = await findPublicHtmlFiles(projectRoot);
const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const missing = [];

  if (!hasMeta(html, "property", "og:image")) missing.push("og:image");
  if (!hasMeta(html, "name", "twitter:image")) missing.push("twitter:image");

  if (missing.length) {
    failures.push(`${relative(projectRoot, file)}: missing ${missing.join(" and ")}`);
  }
}

if (failures.length) {
  console.error("Social preview check failed:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error("\nAdd the branded social preview metadata before publishing this page.");
  process.exit(1);
}

console.log(`Social preview check passed for ${htmlFiles.length} public HTML pages.`);
