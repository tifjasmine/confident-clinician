import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const errors = [];
const canonicals = new Map();

function fileForUrl(url) {
  const pathname = new URL(url).pathname.replace(/\/$/, '');
  if (!pathname) return path.join(root, 'index.html');
  const direct = path.join(root, `${pathname}.html`);
  if (fs.existsSync(direct)) return direct;
  const nested = path.join(root, pathname, 'index.html');
  return nested;
}

for (const url of urls) {
  const file = fileForUrl(url);
  if (!fs.existsSync(file)) {
    errors.push(`Sitemap URL has no source file: ${url}`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const checks = [
    ['title', /<title>[^<]{10,70}<\/title>/i],
    ['description', /<meta\s+name=["']description["']\s+content=["'][^"']{50,180}["']/i],
    ['canonical', /<link\s+rel=["']canonical["']\s+href=["']https:\/\/theconfidentclinician\.me\/[^"']*["']/i],
    ['viewport', /<meta\s+name=["']viewport["']/i],
    ['H1', /<h1(?:\s|>)/i],
    ['main landmark', /<main(?:\s|>)/i]
  ];
  for (const [label, pattern] of checks) if (!pattern.test(html)) errors.push(`${label} missing or invalid: ${path.relative(root, file)}`);
  if (/name=["']robots["'][^>]*noindex/i.test(html)) errors.push(`Sitemap page is noindex: ${url}`);
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
  if (canonical) {
    if (canonicals.has(canonical)) errors.push(`Duplicate canonical: ${canonical}`);
    canonicals.set(canonical, file);
  }
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`Invalid JSON-LD in ${path.relative(root, file)}: ${error.message}`); }
  }
}

for (const required of ['robots.txt', 'sitemap.xml', '404.html', 'favicon-48.png', 'apple-touch-icon.png']) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`Missing required SEO file: ${required}`);
}

if (errors.length) {
  console.error(`SEO verification failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`SEO verification passed for ${urls.length} indexable URLs.`);
