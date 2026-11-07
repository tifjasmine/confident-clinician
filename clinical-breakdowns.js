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
    const meta = [item.readingTime, item.roundTwoEnabled ? "Two rounds" : ""].filter(Boolean).join(" · ");
    const quote = stripQuotes(item.clientStatement);
    const reply = !isCase && item.therapistResponse ? `<p class="pl-card-reply">Therapist: “${escape(stripQuotes(item.therapistResponse))}”</p>` : "";
    return `
      <article class="pl-card">
        <div class="pl-card-meta"><span class="pl-tag ${isCase ? "pl-tag-case" : "pl-tag-response"}">${isCase ? "Case Lab" : "Response Check"}</span>${meta ? `<span>${escape(meta)}</span>` : ""}</div>
        ${quote ? `<blockquote class="pl-quote pl-card-quote">“${escape(quote)}”</blockquote>` : ""}
        ${reply}
        <h3><a href="${exerciseUrl(item.slug)}">${escape(item.title)}</a></h3>
        <p class="pl-card-summary">${escape(item.summary)}</p>
        <div class="pl-card-foot"><span>${escape(item.category || "")}</span><span class="pl-card-go" aria-hidden="true">${isCase ? "Enter the case" : "Try the check"} →</span></div>
      </article>`;
  };

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
      grid.innerHTML = shown.map(cardHtml).join("");
    } else {
      status.textContent = "";
      grid.innerHTML = `<div class="pl-empty"><h3>${query ? "No practice moments match that search." : "None published yet."}</h3><p>${query ? "Try a broader clinical topic." : "New ones are added regularly."}</p></div>`;
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
    const setup = card.querySelector("[data-try-setup]");
    if (pick.caseScenario) setup.textContent = pick.caseScenario; else setup.hidden = true;
    if (pick.reflectionQuestion) card.querySelector("[data-try-ask]").textContent = pick.reflectionQuestion;
    const choicesBox = card.querySelector("[data-try-choices]");
    const next = card.querySelector("[data-try-next]");
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
