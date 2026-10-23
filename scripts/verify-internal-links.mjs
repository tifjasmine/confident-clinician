import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const errors = [];

function sourceForPath(pathname) {
  const clean = pathname.replace(/\/$/, '');
  if (!clean) return path.join(root, 'index.html');
  const direct = path.join(root, `${clean}.html`);
  if (fs.existsSync(direct)) return direct;
  return path.join(root, clean, 'index.html');
}

for (const pageUrl of urls) {
  const source = sourceForPath(new URL(pageUrl).pathname);
  if (!fs.existsSync(source)) continue;
  const html = fs.readFileSync(source, 'utf8');
  const internalLinks = [...html.matchAll(/href=["'](\/[^"]*?)["']/gi)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith('//'));

  if (internalLinks.length < 2) errors.push(`${path.relative(root, source)} has fewer than two internal links`);

  for (const href of internalLinks) {
    const pathname = new URL(href, 'https://theconfidentclinician.me').pathname;
    if (pathname.startsWith('/.netlify/') || /\.(?:png|jpe?g|webp|svg|css|js|pdf)$/i.test(pathname)) continue;
    if (!fs.existsSync(sourceForPath(pathname))) errors.push(`${path.relative(root, source)} links to missing page: ${pathname}`);
  }
}

if (errors.length) {
  console.error(`Internal-link verification failed:\n- ${[...new Set(errors)].join('\n- ')}`);
  process.exit(1);
}

console.log(`Internal-link verification passed for ${urls.length} indexable URLs.`);
