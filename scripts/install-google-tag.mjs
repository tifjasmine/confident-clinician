import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const measurementId = 'G-R4CT95G3TD';
const tag = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${measurementId}');
</script>
<script src="/analytics-events.js" defer></script>`;

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

const files = await collect(root);
let updated = 0;

for (const file of files) {
  let source = await readFile(file, 'utf8');
  const existing = (source.match(/googletagmanager\.com\/gtag\/js/g) || []).length;
  if (existing > 1) throw new Error(`${relative(root, file)} already contains multiple Google tags`);
  if (existing === 1) {
    if (!source.includes(measurementId)) throw new Error(`${relative(root, file)} contains a different Google tag`);
    continue;
  }
  if (!source.includes('<head>')) throw new Error(`${relative(root, file)} has no <head> element`);
  source = source.replace('<head>', `<head>\n${tag}`);
  await writeFile(file, source);
  updated += 1;
}

console.log(`Installed ${measurementId} on ${updated} HTML pages (${files.length} checked).`);
