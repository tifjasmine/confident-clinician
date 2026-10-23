import fs from "node:fs";

const compactTag = `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-R4CT95G3TD"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-R4CT95G3TD');</script><script src="/analytics-events.js" defer></script>`;
const standardTag = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-R4CT95G3TD"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-R4CT95G3TD');
</script>
<script src="/analytics-events.js" defer></script>`;
for (const file of ["clinical-breakdowns.html", "practice-exercise.html"]) {
  let source = fs.readFileSync(file, "utf8").replace(compactTag, standardTag);
  if (!source.includes("/practice-library-refined.css")) source = source.replace('<link rel="stylesheet" href="/practice-library.css">', '<link rel="stylesheet" href="/practice-library.css"><link rel="stylesheet" href="/practice-library-refined.css">');
  if (!source.includes('name="twitter:image"')) source = source.replace('<meta property="og:image" content="https://theconfidentclinician.me/confident-clinician-social.png">', '<meta property="og:image" content="https://theconfidentclinician.me/confident-clinician-social.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://theconfidentclinician.me/confident-clinician-social.png">');
  fs.writeFileSync(file, source);
}
{
  const file = "clinical-breakdowns.html";
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/<main class="library-shell"><section[\s\S]*?<div class="exercise-grid" data-exercise-grid><\/div><\/section>/, `<main class="library-shell"><section aria-labelledby="library-title"><h2 id="library-title" class="eyebrow">Choose a practice folder</h2><div class="folder-nav" aria-label="Practice library folders"><button class="folder active" type="button" data-folder="The Clinical Response Check"><span class="folder-kicker">Folder 01</span><strong>The Clinical Response Check</strong><span>Take a closer look at a therapist's response. Identify what's working, what might be missing, and how you might respond differently.</span><small data-folder-count="The Clinical Response Check">0 exercises</small></button><button class="folder" type="button" data-folder="Clinical Case Lab"><span class="folder-kicker">Folder 02</span><strong>Clinical Case Labs</strong><span>Choose your next clinical move, then examine the reasoning.</span><small data-folder-count="Clinical Case Lab">0 exercises</small></button></div><div class="filters"><label><span class="answer-label">Search this folder</span><input class="search" type="search" data-search placeholder="Try boundaries, alliance, reassurance…"></label></div><div class="folder-heading"><p class="eyebrow" data-current-folder>The Clinical Response Check</p><p class="status" data-library-status>Loading practice exercises…</p></div><div class="exercise-grid" data-exercise-grid></div></section>`);
  source = source.replace("© 2026 The Confident Clinician · Tiffany McGilloway, LPC", "© 2026 The Confident Clinician");
  fs.writeFileSync(file, source);
}
{
  const file = "practice-exercise.js";
  let source = fs.readFileSync(file, "utf8");
  source = source.replace("Your anonymous response is saved so Tiffany can learn from the community's clinical thinking.", "Your anonymous response is saved to help improve future clinical teaching and practice exercises.");
  fs.writeFileSync(file, source);
}
{
  const file = "course/practice-admin.html";
  let source = fs.readFileSync(file, "utf8");
  if (!source.includes('property="og:image"')) source = source.replace("<title>Practice Library Admin | The Confident Clinician</title>", '<title>Practice Library Admin | The Confident Clinician</title><meta property="og:image" content="https://theconfidentclinician.me/confident-clinician-social.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://theconfidentclinician.me/confident-clinician-social.png">');
  fs.writeFileSync(file, source);
}
let sitemap = fs.readFileSync("sitemap.xml", "utf8");
sitemap = sitemap.replace('  <url><loc>https://theconfidentclinician.me/clinical-breakdowns/boundaries-and-guilt</loc><lastmod>2026-10-21</lastmod></url>\n', '');
fs.writeFileSync("sitemap.xml", sitemap);
