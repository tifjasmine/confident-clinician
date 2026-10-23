(() => {
  const api = "/.netlify/functions/practice-library";
  const grid = document.querySelector("[data-exercise-grid]");
  const status = document.querySelector("[data-library-status]");
  const search = document.querySelector("[data-search]");
  const folderHeading = document.querySelector("[data-current-folder]");
  const folderButtons = [...document.querySelectorAll("[data-folder]")];
  const signup = document.querySelector("[data-library-signup]");
  const params = new URLSearchParams(location.search);
  const source = params.get("source") || "direct";
  const campaign = params.get("campaign") || params.get("utm_campaign") || "";
  let sessionId = localStorage.getItem("tccPracticeSession");
  if (!sessionId) { sessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("tccPracticeSession", sessionId); }
  let items = [];
  let currentFolder = "The Clinical Response Check";
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));

  const updateCounts = () => {
    document.querySelectorAll("[data-folder-count]").forEach((node) => {
      const count = items.filter((item) => item.type === node.dataset.folderCount).length;
      node.textContent = `${count} ${count === 1 ? "exercise" : "exercises"}`;
    });
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const shown = items.filter((item) => item.type === currentFolder && [item.title, item.summary, item.category].join(" ").toLowerCase().includes(query));
    folderHeading.textContent = currentFolder === "Clinical Case Lab" ? "Clinical Case Labs" : "The Clinical Response Check";
    status.textContent = shown.length ? `${shown.length} practice ${shown.length === 1 ? "exercise" : "exercises"}` : "";
    grid.innerHTML = shown.length ? shown.map((item) => `
      <article class="exercise-card">
        <span class="type-label">${escape(item.number)} · ${escape(item.category)}</span>
        <h2>${escape(item.title)}</h2>
        <p>${escape(item.summary)}</p>
        <a class="card-link" href="/clinical-breakdowns/${encodeURIComponent(item.slug)}">Begin exercise →</a>
      </article>`).join("") : `<div class="empty"><h2>${query ? "No exercises match that search." : "This folder is being prepared."}</h2><p>${query ? "Try a broader clinical topic." : "New practice exercises will appear here once they are published."}</p></div>`;
  };

  folderButtons.forEach((button) => button.addEventListener("click", () => {
    currentFolder = button.dataset.folder;
    folderButtons.forEach((item) => item.classList.toggle("active", item === button));
    search.value = "";
    render();
  }));
  search.addEventListener("input", render);

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
    } catch (error) { message.textContent = error.message; button.disabled = false; }
  });

  document.querySelector("[data-library-community]")?.addEventListener("click", () => {
    fetch(`${api}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Skool CTA Click", sessionId, source, campaign, page: "practice-library" }) });
  });

  if (!sessionStorage.getItem("tccPracticeLibraryView")) {
    sessionStorage.setItem("tccPracticeLibraryView", "1");
    fetch(`${api}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Library View", sessionId, source, campaign, page: "practice-library", referrer: document.referrer }) });
  }

  fetch(`${api}?action=list`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
    items = data.exercises || [];
    updateCounts();
    render();
  }).catch(() => { status.textContent = "The library could not load. Please refresh and try again."; });
})();
