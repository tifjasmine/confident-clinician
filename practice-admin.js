(() => {
  const api = "/.netlify/functions/practice-funnel-admin";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  const login = $("[data-login]");
  const dashboard = $("[data-dashboard]");
  const logout = $("[data-logout]");
  const status = $("[data-admin-status]");
  const form = $("[data-exercise-form]");
  let data = { exercises: [], attempts: [], responses: [], leads: [], history: [], events: [] };

  const choiceFields = ["A", "B", "C", "D"];
  $("[data-choice-editors]").innerHTML = choiceFields.map((label) => `<div class="case-choice-editor"><strong>Response ${label}</strong><label>Exact response<textarea name="choice${label}Response"></textarea></label><label>Clinical label<input name="choice${label}Title"></label><label>What it accomplishes<textarea name="choice${label}Accomplishes"></textarea></label><label>What is helpful<textarea name="choice${label}Helpful"></textarea></label><label>What it might overlook<textarea name="choice${label}Overlooks"></textarea></label><label>Potential risks or limitations<textarea name="choice${label}Risks"></textarea></label><label>When it could be appropriate<textarea name="choice${label}Appropriate"></textarea></label></div>`).join("");

  const request = async (action, options = {}) => {
    const response = await fetch(`${api}?action=${action}`, { credentials: "same-origin", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Request failed.");
    return result;
  };
  const switchTab = (name) => {
    $$("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$("[data-pane]").forEach((pane) => pane.classList.toggle("active", pane.dataset.pane === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const formValue = (name, value = "") => { if (form.elements[name]) form.elements[name].value = value ?? ""; };
  const formChecked = (name, value = false) => { if (form.elements[name]) form.elements[name].checked = Boolean(value); };
  const parseJson = (name) => { try { return JSON.parse(form.elements[name].value || "[]"); } catch { throw new Error(`${name} must contain valid JSON.`); } };

  const updateAuthoringFields = () => {
    const type = form.type.value;
    $$("[data-type-panel]").forEach((panel) => { panel.hidden = panel.dataset.typePanel !== type; });
    const roundTwo = form.roundTwoEnabled.checked;
    $("[data-round-two-editor]").hidden = !roundTwo;
    $("[data-round-two-choices]").hidden = !roundTwo || form.roundTwoAnswerFormat.value !== "Multiple choice";
  };

  const resetExercise = () => {
    form.reset();
    formValue("id"); formValue("exerciseId"); formValue("clinicalPoints", "[]"); formValue("reflectionPrompts", "[]"); formValue("roundTwoChoices", "[]");
    updateAuthoringFields();
    switchTab("exercises");
  };

  const editExercise = (item) => {
    ["id", "exerciseId", "type", "status", "number", "title", "slug", "category", "summary", "clientStatement", "therapistResponse", "caseScenario", "hint", "clinicalConsideration", "clinicalConsiderationExplanation", "therapistIntention", "preferredStartingPoint", "biggerLesson", "nuance", "practicalApplication", "seoDescription", "publicationDate", "roundTwoClientResponse", "roundTwoQuestion", "roundTwoAnswerFormat", "roundTwoBreakdown", "whatChangedBetweenDecisions"].forEach((key) => formValue(key, item[key]));
    formValue("reflectionQuestion", item.type === "The Clinical Response Check" ? item.reflectionQuestion : "");
    formValue("caseQuestion", item.type === "Clinical Case Lab" ? item.reflectionQuestion : "");
    formValue("clinicalPoints", JSON.stringify(item.clinicalPoints || [], null, 2));
    formValue("reflectionPrompts", JSON.stringify(item.reflectionPrompts || [], null, 2));
    formValue("roundTwoChoices", JSON.stringify(item.roundTwoChoices || [], null, 2));
    formChecked("roundTwoEnabled", item.roundTwoEnabled);
    formChecked("saveFreeTextResponses", item.saveFreeTextResponses);
    ["A", "B", "C"].forEach((label, index) => {
      const alt = item.alternatives?.[index] || {};
      formValue(`alt${label}Title`, alt.title); formValue(`alt${label}Response`, alt.response); formValue(`alt${label}Why`, alt.why || alt.explanation);
    });
    choiceFields.forEach((label) => {
      const choice = item.choices?.find((entry) => entry.label === label) || {};
      ["Response", "Title", "Accomplishes", "Helpful", "Overlooks", "Risks", "Appropriate"].forEach((key) => formValue(`choice${label}${key}`, choice[key.toLowerCase()]));
    });
    updateAuthoringFields();
    switchTab("exercises");
  };

  const buildPayload = () => {
    const fields = Object.fromEntries(new FormData(form));
    fields.reflectionQuestion = fields.type === "Clinical Case Lab" ? fields.caseQuestion : fields.reflectionQuestion;
    fields.clinicalPoints = parseJson("clinicalPoints");
    fields.reflectionPrompts = parseJson("reflectionPrompts");
    fields.roundTwoChoices = parseJson("roundTwoChoices");
    fields.roundTwoEnabled = form.roundTwoEnabled.checked;
    fields.saveFreeTextResponses = form.saveFreeTextResponses.checked;
    fields.alternatives = ["A", "B", "C"].map((label) => ({ label, title: fields[`alt${label}Title`] || "", response: fields[`alt${label}Response`] || "", why: fields[`alt${label}Why`] || "" })).filter((item) => item.response);
    fields.choices = choiceFields.map((label) => ({ label, response: fields[`choice${label}Response`] || "", title: fields[`choice${label}Title`] || "", accomplishes: fields[`choice${label}Accomplishes`] || "", helpful: fields[`choice${label}Helpful`] || "", overlooks: fields[`choice${label}Overlooks`] || "", risks: fields[`choice${label}Risks`] || "", appropriate: fields[`choice${label}Appropriate`] || "" })).filter((item) => item.response);
    return fields;
  };

  const renderFunnel = () => {
    const stage = $("[data-stage-filter]").value;
    const term = $("[data-search]").value.trim().toLowerCase();
    const filtered = data.events.filter((item) => (!stage || item["Event Type"] === stage) && (!term || [item["Instagram Handle"], item.Keyword, item.Campaign, item["ManyChat Contact ID"]].some((value) => String(value || "").toLowerCase().includes(term))));
    $("[data-events]").innerHTML = filtered.map((item) => `<tr><td>${escape(new Date(item["Event At"]).toLocaleString())}</td><td>${item["Instagram Handle"] ? `@${escape(item["Instagram Handle"])}` : "—"}</td><td>${escape(item["Event Type"])}</td><td>${escape(item.Keyword || "—")}</td><td>${escape(item.Campaign || "—")}</td><td>${escape(item["Exercise Reference"] || "—")}</td></tr>`).join("");
    $("[data-empty]").hidden = filtered.length > 0;
  };

  const saveResponse = async (event) => {
    event.preventDefault();
    const responseForm = event.currentTarget;
    const button = responseForm.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = "Saving your review to Airtable…";
    try {
      await request("save-response", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(responseForm))) });
      await load();
      switchTab("participation");
      status.textContent = "Review saved.";
    } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
  };

  const render = () => {
    const counts = data.events.reduce((all, item) => { all[item["Event Type"]] = (all[item["Event Type"]] || 0) + 1; return all; }, {});
    const labels = ["Keyword Triggered", "Access Requested", "Exercise Opened", "Exercise Submitted", "Email Subscribed", "Community Clicked"];
    $("[data-summary]").innerHTML = labels.slice(0, 4).map((label) => `<article class="summary-card"><strong>${counts[label] || 0}</strong><span>${escape(label)}</span></article>`).join("");
    const statusCounts = data.exercises.reduce((all, item) => { all[item.status || "Unknown"] = (all[item.status || "Unknown"] || 0) + 1; return all; }, {});
    $("[data-content-status]").innerHTML = Object.entries(statusCounts).map(([label, count]) => `<p class="status-row"><span>${escape(label)}</span><strong>${count}</strong></p>`).join("") || "<p>No exercises yet.</p>";
    $("[data-exercise-list]").innerHTML = [...data.exercises].sort((a, b) => String(a.number).localeCompare(String(b.number))).map((item) => `<button class="exercise-item" data-edit="${escape(item.id)}"><strong>${escape(item.number || "—")} · ${escape(item.title)}</strong><span>${escape(item.type)} · ${escape(item.status)}${item.roundTwoEnabled ? " · Two rounds" : ""}</span></button>`).join("");
    $$("[data-edit]").forEach((button) => button.onclick = () => editExercise(data.exercises.find((item) => item.id === button.dataset.edit)));
    $("[data-attempts]").innerHTML = data.attempts.length ? data.attempts.map((item) => {
      const reply = data.responses.find((entry) => entry["Attempt ID"] === item["Attempt ID"]) || {};
      return `<article class="panel record-card"><p class="eyebrow">${escape(item["Exercise Type"] || "Practice")} · ${escape(item["Review Status"] || "New")}</p><h2>${escape(item["Exercise Slug"] || "Exercise")}</h2>${item["Visitor Response"] ? `<p class="response">${escape(item["Visitor Response"])}</p>` : ""}<p>${item["Selected Option"] ? `Round One: ${escape(item["Selected Option"])}` : "Written reflection completed"}${item["Round Two Selected Option"] ? ` · Round Two: ${escape(item["Round Two Selected Option"])}` : ""}</p><p>${item["Instagram Handle"] ? `Instagram: @${escape(item["Instagram Handle"])}` : "Website visitor"}</p><small>${escape(item["Submitted At"] || "")} · ${escape(item.Source || "direct")}</small><details class="response-editor"><summary>Review & respond</summary><form data-response-form><input type="hidden" name="attemptId" value="${escape(item["Attempt ID"])}"><input type="hidden" name="attemptRecordId" value="${escape(item.id)}"><input type="hidden" name="exerciseSlug" value="${escape(item["Exercise Slug"])}"><input type="hidden" name="responseId" value="${escape(reply["Response ID"] || "")}"><input type="hidden" name="responseRecordId" value="${escape(reply.id || "")}"><label>Review status<select name="reviewStatus"><option>New</option><option>Reviewed</option><option>Responded</option><option>Archived</option></select></label><label>Response status<select name="responseStatus"><option>Draft</option><option>Ready</option><option>Published</option><option>Internal only</option></select></label><label>Your response<textarea name="publicResponse">${escape(reply["Public Response"] || "")}</textarea></label><label>Internal notes<textarea name="internalNotes">${escape(reply["Internal Notes"] || "")}</textarea></label><button type="submit">Save review</button></form></details></article>`;
    }).join("") : "<p>No participation yet.</p>";
    $$("[data-response-form]").forEach((responseForm) => {
      const attempt = data.attempts.find((item) => item["Attempt ID"] === responseForm.attemptId.value);
      const reply = data.responses.find((item) => item["Attempt ID"] === responseForm.attemptId.value);
      responseForm.reviewStatus.value = attempt?.["Review Status"] || "New";
      responseForm.responseStatus.value = reply?.["Response Status"] || "Draft";
      responseForm.addEventListener("submit", saveResponse);
    });
    $("[data-leads]").innerHTML = data.leads.length ? data.leads.map((item) => `<article class="panel record-card"><p class="eyebrow">${escape(item.Source || "direct")}</p><h2>${escape(item["First Name"] || item["Instagram Handle"] || "Unnamed lead")}</h2><p>${item.Email ? escape(item.Email) : "No email yet"}${item["Instagram Handle"] ? ` · @${escape(item["Instagram Handle"])}` : ""}</p><small>Last activity: ${escape(item["Last Activity At"] || "—")}</small></article>`).join("") : "<p>No leads yet.</p>";
    $("[data-history]").innerHTML = data.history.length ? data.history.map((item) => `<article class="panel record-card"><p class="eyebrow">${escape(item["Event Type"])}</p><h2>${escape(item.Actor || "System")}</h2><p>${escape(item["Details JSON"] || "")}</p><small>${escape(item["Occurred At"] || "")}</small></article>`).join("") : "<p>No activity history yet.</p>";
    $("[data-stage-filter]").innerHTML = '<option value="">All stages</option>' + labels.map((label) => `<option>${label}</option>`).join("");
    renderFunnel();
  };

  const load = async () => {
    status.textContent = "Loading Airtable data…";
    try { data = await request("dashboard"); render(); status.textContent = ""; } catch (error) { status.textContent = error.message; }
  };
  const openDashboard = async () => { login.hidden = true; dashboard.hidden = false; logout.hidden = false; await load(); };

  $("[data-login-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const loginStatus = $("[data-login-status]");
    loginStatus.textContent = "Signing in…";
    try { await request("login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); loginStatus.textContent = ""; await openDashboard(); } catch (error) { loginStatus.textContent = error.message; }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    status.textContent = "Saving to Airtable…";
    try {
      const saved = await request("save-exercise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
      await load();
      editExercise(saved.exercise);
      status.textContent = "Exercise saved.";
    } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
  });

  $$("[data-new-exercise]").forEach((button) => button.addEventListener("click", resetExercise));
  form.type.addEventListener("change", updateAuthoringFields);
  form.roundTwoEnabled.addEventListener("change", updateAuthoringFields);
  form.roundTwoAnswerFormat.addEventListener("change", updateAuthoringFields);
  $("[data-preview]").addEventListener("click", () => {
    if (!form.id.value) { status.textContent = "Save this exercise as a draft before opening its participant preview."; return; }
    open(`/practice-exercise.html?previewId=${encodeURIComponent(form.id.value)}&slug=${encodeURIComponent(form.slug.value)}`, "_blank");
  });
  $$("[data-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $("[data-stage-filter]").addEventListener("change", renderFunnel);
  $("[data-search]").addEventListener("input", renderFunnel);
  logout.addEventListener("click", async () => { await request("logout", { method: "POST" }); location.reload(); });
  updateAuthoringFields();
  request("session").then(openDashboard).catch(() => {});
})();
