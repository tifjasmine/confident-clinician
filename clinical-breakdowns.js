(() => {
  const api = "/.netlify/functions/practice-library";
  const grid = document.querySelector("[data-exercise-grid]");
  const status = document.querySelector("[data-library-status]");
  const search = document.querySelector("[data-search]");
  const searchWrap = document.querySelector("[data-search-wrap]");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const signup = document.querySelector("[data-library-signup]");
  const params = new URLSearchParams(location.search);
  const source = params.get("source") || "direct";
  const campaign = params.get("campaign") || params.get("utm_campaign") || "";
  const SEARCH_THRESHOLD = 8;
  const CASE = "Clinical Case Lab";
  const RESPONSE = "The Clinical Response Check";
  let sessionId = localStorage.getItem("tccPracticeSession");
  if (!sessionId) { sessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("tccPracticeSession", sessionId); }
  let items = [];
  let currentFilter = "all";
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
  const stripQuotes = (text = "") => String(text).trim().replace(/^["“”']+|["“”']+$/g, "");
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

  // Keep Instagram / ManyChat attribution when a visitor moves from the library into an exercise.
  const exerciseUrl = (slug) => {
    const url = `/clinical-breakdowns/${encodeURIComponent(slug)}`;
    const carry = new URLSearchParams();
    if (params.get("source")) carry.set("source", params.get("source"));
    if (campaign) carry.set("campaign", campaign);
    const query = carry.toString();
    return query ? `${url}?${query}` : url;
  };

  const newestFirst = (a, b) => String(b.publicationDate || "").localeCompare(String(a.publicationDate || ""));

  const cardHtml = (item) => {
    const isCase = item.type === CASE;
    const meta = [item.readingTime, item.roundTwoEnabled ? "Two rounds" : ""].filter(Boolean).join(" · ") || (isCase ? "Choose your move" : "Review a response");
    const quote = stripQuotes(item.clientStatement);
    const reply = !isCase && item.therapistResponse ? `<p class="pl-card-reply"><b>Therapist responds</b>${escape(stripQuotes(item.therapistResponse))}</p>` : "";
    return `
      <article class="pl-card">
        <div class="pl-card-top"><span class="pl-badge ${isCase ? "pl-badge-case" : "pl-badge-response"}">${isCase ? "Case Lab" : "Response Check"}</span><span>${escape(meta)}</span></div>
        <div class="pl-card-body">
          ${quote ? `<p class="pl-quote-lead">Your client says:</p><blockquote class="pl-card-quote">“${escape(quote)}”</blockquote>` : ""}
          ${reply}
          <h3>${escape(item.title)}</h3>
          <p class="pl-card-summary">${escape(item.summary)}</p>
          <div class="pl-card-foot">
            <span class="pl-card-topic">${escape(item.category || "")}</span>
            <a class="pl-btn pl-btn-dark" href="${exerciseUrl(item.slug)}" aria-label="${escape(`${isCase ? "Enter the case" : "Try the check"}: ${item.title}`)}">${isCase ? "Enter the case" : "Try the check"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          </div>
        </div>
      </article>`;
  };

  const nextCard = `
      <article class="pl-card pl-card-next">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        <h3>The next moment is on its way.</h3>
        <p>Get each new practice moment by email, or talk it through in the community.</p>
        <a href="#notify">Notify me →</a>
      </article>`;

  const updateCounts = () => {
    document.querySelectorAll("[data-filter-count]").forEach((node) => {
      const key = node.dataset.filterCount;
      const count = key === "all" ? items.length : items.filter((item) => item.type === key).length;
      node.textContent = `(${count})`;
    });
    if (searchWrap) searchWrap.hidden = items.length < SEARCH_THRESHOLD;
  };

  const render = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const shown = items.filter((item) => (currentFilter === "all" || item.type === currentFilter)
      && [item.title, item.summary, item.category, item.clientStatement].join(" ").toLowerCase().includes(query));
    if (shown.length) {
      status.textContent = query || currentFilter !== "all" ? `Showing ${plural(shown.length, "practice moment")}` : "";
      grid.innerHTML = shown.map(cardHtml).join("") + (query ? "" : nextCard);
    } else {
      status.textContent = "";
      grid.innerHTML = `<div class="pl-empty"><h3>${query ? "No practice moments match that search." : "This type is being prepared."}</h3><p>${query ? "Try a broader clinical topic." : "New practice moments will appear here once they’re published."}</p></div>${query ? "" : nextCard}`;
    }
  };

  const setFilter = (key) => {
    currentFilter = key;
    filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === key)));
    render();
    window.tccTrack?.("practice_library_filter", { filter: key });
  };
  filterButtons.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
  search?.addEventListener("input", render);

  // "Try one now": the newest published Case Lab that has authored choices.
  const setupTryCard = () => {
    const card = document.querySelector("[data-try-card]");
    if (!card) return;
    const pick = items.filter((item) => item.type === CASE && item.clientStatement && Array.isArray(item.choices) && item.choices.some((c) => c && c.title)).sort(newestFirst)[0];
    if (!pick) return;
    card.querySelector("[data-try-quote]").textContent = `“${stripQuotes(pick.clientStatement)}”`;
    const choicesBox = card.querySelector("[data-try-choices]");
    const next = card.querySelector("[data-try-next]");
    const hint = card.querySelector("[data-try-hint]");
    card.querySelector("[data-try-link]").href = exerciseUrl(pick.slug);
    pick.choices.filter((c) => c && c.title).slice(0, 4).forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.textContent = choice.title;
      button.addEventListener("click", () => {
        const wasOn = button.getAttribute("aria-pressed") === "true";
        choicesBox.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", String(!wasOn));
        next.hidden = wasOn;
        hint.hidden = !wasOn;
        if (!wasOn) window.tccTrack?.("practice_library_try_choice", { exercise_slug: pick.slug, choice: choice.label || choice.title, source, campaign });
      });
      choicesBox.appendChild(button);
    });
    card.querySelector("[data-try-link]").addEventListener("click", () => {
      window.tccTrack?.("practice_library_try_continue", { exercise_slug: pick.slug, source, campaign });
    });
    card.hidden = false;
  };

  signup?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = signup.querySelector("[data-library-signup-status]");
    const button = signup.querySelector("button");
    const form = new FormData(signup);
    button.disabled = true;
    message.textContent = "Adding you…";
    try {
      const response = await fetch(`${api}?action=signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), email: form.get("email"), consent: form.get("consent") === "on", exerciseId: "practice-library", source, campaign }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      signup.innerHTML = `<div class="signup-success"><h3>${escape(data.message)}</h3><p>Your next clinical challenge will come to your inbox.</p></div>`;
      window.tccTrack?.("practice_email_opt_in", { source, campaign, location: "library_home" });
    } catch (error) { message.textContent = error.message || "That didn’t go through. Please try again."; button.disabled = false; }
  });

  document.querySelector("[data-library-community]")?.addEventListener("click", () => {
    fetch(`${api}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Skool CTA Click", sessionId, source, campaign, page: "practice-library" }) });
  });

  if (!sessionStorage.getItem("tccPracticeLibraryView")) {
    sessionStorage.setItem("tccPracticeLibraryView", "1");
    fetch(`${api}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Library View", sessionId, source, campaign, page: "practice-library", referrer: document.referrer }) });
  }

  grid.innerHTML = '<div class="pl-skeleton" aria-hidden="true"></div><div class="pl-skeleton" aria-hidden="true"></div>';
  fetch(`${api}?action=list`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
    items = (data.exercises || []).slice().sort(newestFirst);
    updateCounts();
    render();
    setupTryCard();
  }).catch(() => {
    grid.innerHTML = "";
    status.textContent = "The library couldn’t load. Please refresh and try again.";
  });
})();
