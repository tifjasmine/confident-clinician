(function () {
  const track = (name, parameters = {}) => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, parameters);
  };

  window.tccTrack = track;

  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.replace(/\.html$/, '') || '/';

    if (path === '/clinical-confidence-lab') {
      track('lab_view');
    }

    if (path === '/resources' || path.startsWith('/resources/')) {
      track('resource_view', { resource_path: path });
    }

    if (path === '/clinical-breakdowns' || path.startsWith('/clinical-breakdowns/')) {
      track('practice_library_view', { practice_path: path });
    }

    const waitlistForms = document.querySelectorAll('#lab-waitlist-form, #homepage-lab-waitlist-form');
    waitlistForms.forEach((form) => {
      form.addEventListener('focusin', () => {
        if (form.dataset.analyticsStarted === 'true') return;
        form.dataset.analyticsStarted = 'true';
        track('waitlist_form_start', { form_id: form.id });
      });
    });

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const href = link.href || '';

      if (href.includes('skool.com/the-confident-clinician')) {
        track('community_click', { link_url: href });
      }

      if (href.includes('theembodiedself.me/media')) {
        track('movement_library_click', { link_url: href });
      }

      if (href.includes('/clinical-confidence-lab')) {
        track('lab_interest_click', { link_url: href, link_text: link.textContent.trim() });
      }
    });
  });
})();
