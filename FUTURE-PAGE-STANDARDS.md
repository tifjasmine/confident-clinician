# Future Page Standards

Use this checklist whenever a public page is added or substantially revised.

- Include the GA4 tag exactly once, immediately after `<head>`, plus `/analytics-events.js`.
- Give the page a unique title, meta description, canonical URL, social preview metadata, and one clear H1.
- Use semantic landmarks: navigation, one `<main>`, and footer.
- Keep mobile body copy at least 16px with comfortable line height and tap targets at least 44px.
- Use accessible contrast for text, links, navigation states, labels, and buttons.
- Resize and compress images for their rendered dimensions; add width, height, responsive `srcset`/`sizes`, descriptive alt text, and lazy loading below the fold.
- Preload only the above-the-fold hero image. Avoid render-blocking font and secondary stylesheet requests.
- Add relevant internal links and include indexable pages in `sitemap.xml`.
- Run the social preview, SEO, and analytics verification scripts before every deployment.
- Test the finished page on mobile and run PageSpeed Insights on important landing pages.
