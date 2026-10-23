import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const measurementId = 'G-R4CT95G3TD';
const loader = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
const expectedStart = `<head>\n<!-- Google tag (gtag.js) -->\n<script async src="${loader}"></script>`;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }

  return files;
}

const rootPath = fileURLToPath(root);
const files = await findHtmlFiles(rootPath);
const failures = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const name = relative(rootPath, file);
  const loaderCount = html.split(loader).length - 1;
  const configCount = html.split(`gtag('config', '${measurementId}')`).length - 1;
  const eventsCount = html.split('<script src="/analytics-events.js" defer></script>').length - 1;

  if (!html.includes(expectedStart)) failures.push(`${name}: Google tag is not immediately after <head>`);
  if (loaderCount !== 1) failures.push(`${name}: expected one loader, found ${loaderCount}`);
  if (configCount !== 1) failures.push(`${name}: expected one config call, found ${configCount}`);
  if (eventsCount !== 1) failures.push(`${name}: expected one analytics-events script, found ${eventsCount}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Analytics verification passed for ${files.length} HTML pages.`);
