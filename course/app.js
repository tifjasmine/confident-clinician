const API = "/.netlify/functions/course-api";
const AUTH = "/.netlify/functions/course-auth";
const ACTIVATE = "/.netlify/functions/course-activate";
const SESSION_KEY = "tccCourseSession";
const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
const state = { token: "", profile: null, activity: [], submissions: [], questions: [], content: [], workbookResponses: [], formResponses: [], selectedWeek: 1 };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

const api = async (action, options = {}) => {
  const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    signOut();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(result.message || "Something did not save. Please try again.");
  return result;
};

const saveSession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  state.token = session.accessToken;
};

const readSession = () => {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (session?.accessToken) state.token = session.accessToken;
    return session;
  } catch { return null; }
};

const signOut = () => {
  sessionStorage.removeItem(SESSION_KEY);
  state.token = "";
  state.profile = null;
  $("[data-app]").hidden = true;
  $("[data-login-view]").hidden = false;
};

const setAccessMode = (mode) => {
  $$("[data-access-tab]").forEach((button) => {
    const active = button.dataset.accessTab === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $$("[data-access-form]").forEach((form) => { form.hidden = form.dataset.accessForm !== mode; });
  $("[data-access-heading]").textContent = mode === "login" ? "Welcome back." : "Set up your account.";
  $("[data-access-copy]").textContent = mode === "login"
    ? "Already chose a password? Log in here."
    : "First time here? Enter the email you gave Tiffany. We’ll send you a secure link to choose your password.";
  $("[data-login-status]").textContent = "";
};

const showView = (name) => {
  $$("[data-view]").forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  $$("[data-view-button]").forEach((button) => button.classList.toggle("active", button.dataset.viewButton === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const setCourseForProfile = () => {
  window.TCC_COURSE = window.TCC_COURSES[state.profile?.program]
    || window.TCC_COURSES["Confident Clinician Intensive"];
  $("[data-program-name]").textContent = window.TCC_COURSE.title;
  $("[data-roadmap-label]").textContent = `${window.TCC_COURSE.weeks.length}-Week Roadmap`;
};

const activitiesForWeek = (week) => state.activity.filter((item) => Number(item.week) === Number(week) && item.completed);
const activityDone = (week, type) => activitiesForWeek(week).some((item) => item.activityType === type);
const lessonWatched = (contentId) => state.activity.some((item) => item.completed && item.activityType === "Lesson accessed" && item.response === contentId);
const weekCompletion = (week) => {
  const nonVideoTypes = window.TCC_COURSE.activityTypes.filter((type) => type !== "Lesson accessed");
  const videos = state.content.filter((item) => Number(item.week) === Number(week) && item.videoUrl);
  const done = nonVideoTypes.filter((type) => activityDone(week, type)).length + videos.filter((item) => lessonWatched(item.contentId)).length;
  return Math.round((done / Math.max(1, nonVideoTypes.length + videos.length)) * 100);
};

const renderDashboard = () => {
  const profile = state.profile;
  const currentWeekNumber = Math.min(window.TCC_COURSE.weeks.length, Math.max(1, Number(profile.currentWeek || 1)));
  const week = window.TCC_COURSE.weeks[currentWeekNumber - 1];
  const completedActivities = state.activity.filter((item) => item.completed).length;
  const nonVideoTypeCount = window.TCC_COURSE.activityTypes.filter((type) => type !== "Lesson accessed").length;
  const totalActivities = (window.TCC_COURSE.weeks.length * nonVideoTypeCount) + state.content.filter((item) => item.videoUrl).length;
  const progress = Math.min(100, Math.round((completedActivities / Math.max(1, totalActivities)) * 100));
  const opened = new Set(state.activity.filter((item) => item.activityType === "Lesson accessed" && item.completed).map((item) => item.response || `week-${item.week}`)).size;

  $("[data-first-name]").textContent = (profile.name || "clinician").split(" ")[0];
  $("[data-current-week-label]").textContent = `Week ${week.number} · ${week.tool}`;
  $("[data-current-week-title]").textContent = week.title;
  $("[data-current-week-description]").textContent = week.description;
  $("[data-progress-ring]").style.setProperty("--value", progress);
  $("[data-progress-percent]").textContent = `${progress}%`;
  $("[data-modules-count]").textContent = opened;
  $("[data-milestones-count]").textContent = state.submissions.length;

  const weekVideos = state.content.filter((item) => Number(item.week) === Number(week.number) && item.videoUrl);
  const remaining = [
    ...(weekVideos.some((item) => !lessonWatched(item.contentId)) ? ["Watch the remaining lesson videos"] : []),
    ...window.TCC_COURSE.activityTypes.filter((type) => type !== "Lesson accessed" && !activityDone(week.number, type)),
  ].slice(0, 3);
  $("[data-next-steps]").innerHTML = (remaining.length ? remaining : ["Pause and notice what changed", "Prepare one mentorship question"]).map((step, index) => `
    <li class="next-item"><span class="next-dot">${index + 1}</span><p>${escapeHtml(step)}</p></li>
  `).join("");
};

const renderCurriculum = () => {
  const current = Number(state.profile.currentWeek || 1);
  $("[data-week-grid]").innerHTML = window.TCC_COURSE.weeks.map((week) => {
    const locked = week.number > current;
    const completion = weekCompletion(week.number);
    return `
      <button class="week-card ${locked ? "locked" : ""}" data-open-week="${week.number}" ${locked ? "disabled" : ""}>
        <span class="week-number">Week ${week.number}${week.milestone ? " · Feedback milestone" : ""}</span>
        <h3>${escapeHtml(week.shortTitle)}</h3>
        <p>${escapeHtml(week.description)}</p>
        <span class="week-meta">${escapeHtml(week.tool)}</span>
        <span class="week-state">${locked ? "Opens later" : completion ? `${completion}% complete` : "Ready to begin"}</span>
      </button>
    `;
  }).join("");
  $$("[data-open-week]").forEach((button) => button.addEventListener("click", () => openWeek(Number(button.dataset.openWeek))));
};

const getVideoEmbed = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (host === "wistia.com" || host.endsWith(".wistia.com") || host === "wistia.net" || host.endsWith(".wistia.net")) {
      const iframeIndex = pathParts.indexOf("iframe");
      const mediaId = iframeIndex >= 0 ? pathParts[iframeIndex + 1] : pathParts[pathParts.length - 1];
      if (mediaId && /^[a-z0-9]+$/i.test(mediaId)) {
        return {
          src: `https://fast.wistia.net/embed/iframe/${mediaId}?videoFoam=true&playerColor=c56a4d&seo=false`,
          title: "Weekly teaching video",
        };
      }
    }

    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      const videoId = host === "youtu.be" ? pathParts[0] : parsed.searchParams.get("v") || pathParts[pathParts.length - 1];
      if (videoId && /^[\w-]+$/.test(videoId)) {
        return { src: `https://www.youtube-nocookie.com/embed/${videoId}`, title: "Weekly teaching video" };
      }
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const videoId = [...pathParts].reverse().find((part) => /^\d+$/.test(part));
      if (videoId) return { src: `https://player.vimeo.com/video/${videoId}`, title: "Weekly teaching video" };
    }
  } catch {
    return null;
  }
  return null;
};

const workbookSectionPlan = {
  1: [
    ["Reset the definition", 3],
    ["Name the real gap", 3],
    ["Notice your activation pattern", 4],
    ["Map one confidence loop", 12],
    ["Practice: The Quiet Client", 7],
    ["Choose one small experiment", 2],
    ["Reflect, then stop", 7],
  ],
  2: [
    ["C — Center", 4],
    ["L — Listen", 5],
    ["E — Evaluate", 4],
    ["A — Act", 5],
    ["R — Reflect", 5],
    ["Use the CLEAR Decision Map", 6],
    ["Practice: “I Don’t Know”", 6],
    ["Try CLEAR in real work", 3],
    ["Reflect, then stop", 6],
  ],
  3: [
    ["Open with direction", 3],
    ["Find and check the thread", 5],
    ["Move beyond the details", 3],
    ["Handle pressure points", 1],
    ["Land the session cleanly", 5],
    ["Make the language yours", 2],
    ["Practice: The Session That Goes Everywhere", 8],
    ["Try an opening, pivot, and close", 4],
    ["Reflect, then stop", 8],
  ],
  4: [
    ["Separate reflection from replaying", 4],
    ["Clarify your responsibility", 6],
    ["Catch the rescue trap", 4],
    ["Choose the right support path", 3],
    ["Prepare for repair", 7],
    ["Use the seven-minute debrief", 6],
    ["Define the clinician you trust", 2],
    ["Practice: The Case That Is Not Progressing", 4],
    ["Name your evidence of growth", 3],
    ["Build your 30-day plan", 6],
    ["Final reflection, then stop", 7],
  ],
};

const buildWorkbookSections = (week, prompts, savedResponses = []) => {
  const plan = workbookSectionPlan[Number(week)] || [["Workbook prompts", prompts.length]];
  let start = 0;
  const sections = plan.map(([title, size]) => {
    const sectionPrompts = prompts.slice(start, start + size).map((prompt, offset) => ({
      prompt,
      index: start + offset,
    }));
    start += size;
    return { title, prompts: sectionPrompts };
  }).filter((section) => section.prompts.length);
  if (start < prompts.length) {
    sections.push({
      title: "Finish this week",
      prompts: prompts.slice(start).map((prompt, offset) => ({ prompt, index: start + offset })),
    });
  }
  return sections.map((section) => ({
    ...section,
    answered: section.prompts.filter(({ index }) => String(savedResponses[index] || "").trim()).length,
  }));
};

const renderModule = (week) => {
  const weekContent = state.content.filter((item) => Number(item.week) === Number(week.number));
  const primaryContent = weekContent[0];
  $("[data-module-week]").textContent = `Week ${week.number}`;
  $("[data-module-title]").textContent = primaryContent?.title || week.title;
  $("[data-module-description]").textContent = primaryContent?.description || week.description;
  $("[data-module-tool]").textContent = week.tool;
  $("[data-lesson-list]").innerHTML = weekContent.length ? weekContent.map((item, index) => {
    const video = getVideoEmbed(item.videoUrl);
    const saved = state.workbookResponses.find((response) => response.contentId === item.contentId);
    const prompts = item.workbookPrompts || [];
    const workbookSections = buildWorkbookSections(week.number, prompts, saved?.responses || []);
    const firstIncompleteSection = workbookSections.findIndex((section) => section.answered < section.prompts.length);
    return `
      <article class="lesson-card">
        <div class="lesson-heading">
          <p class="eyebrow">Lesson ${index + 1} · ${escapeHtml(item.contentType)}</p>
          <h2>${escapeHtml(item.title)}</h2>
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        </div>
        ${video ? `<div class="lesson-video"><iframe src="${escapeHtml(video.src)}" title="${escapeHtml(item.title || video.title)}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : item.videoUrl ? `<a class="button" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener">Open Video</a>` : ""}
        ${item.videoUrl ? `<label class="video-complete"><input type="checkbox" data-video-complete="${escapeHtml(item.contentId)}" data-video-week="${week.number}" ${lessonWatched(item.contentId) ? "checked" : ""}><span><strong>${lessonWatched(item.contentId) ? "Video complete" : "Mark video watched"}</strong><small>Check this after you finish this video.</small></span></label>` : ""}
        ${prompts.length ? `
          <form class="workbook-form" data-workbook-form="${escapeHtml(item.contentId)}" data-workbook-week="${week.number}">
            <div class="workbook-heading">
              <p class="eyebrow">Interactive Workbook</p>
              <h3>${escapeHtml(item.workbookTitle || item.title)}</h3>
              <p>Your answers save privately to your course account. Use fictional, composite, or fully de-identified examples only.</p>
            </div>
            <div class="workbook-progress-copy">
              <strong>Take this one section at a time.</strong>
              <span>${prompts.filter((_, promptIndex) => String(saved?.responses?.[promptIndex] || "").trim()).length} of ${prompts.length} responses saved</span>
            </div>
            <div class="workbook-sections">
              ${workbookSections.map((section, sectionIndex) => `
                <details class="workbook-section" data-workbook-section ${sectionIndex === (firstIncompleteSection < 0 ? 0 : firstIncompleteSection) ? "open" : ""}>
                  <summary>
                    <span><small>Part ${sectionIndex + 1} of ${workbookSections.length}</small>${escapeHtml(section.title)}</span>
                    <span class="workbook-section-count">${section.answered === section.prompts.length ? "Complete" : `${section.answered}/${section.prompts.length}`}</span>
                  </summary>
                  <div class="workbook-prompts">
                    ${section.prompts.map(({ prompt, index: promptIndex }) => `<label>${escapeHtml(prompt)}<textarea name="response-${promptIndex}" data-workbook-response="${promptIndex}">${escapeHtml(saved?.responses?.[promptIndex] || "")}</textarea></label>`).join("")}
                  </div>
                </details>
              `).join("")}
            </div>
            ${item.stoppingStatement ? `<blockquote>${escapeHtml(item.stoppingStatement)}</blockquote>` : ""}
            <div class="form-actions workbook-save"><button class="button" type="submit">Save My Progress</button><span class="workbook-status" data-workbook-status>${saved?.savedAt ? "Progress saved" : ""}</span></div>
          </form>
        ` : ""}
      </article>
    `;
  }).join("") : `
    <div class="lesson-placeholder"><div><span>Weekly Teaching</span><strong>${escapeHtml(week.shortTitle)}</strong><div data-lesson-media><span>Lessons will appear here when Tiffany publishes them.</span></div></div></div>
  `;
  const resources = weekContent.flatMap((item) => {
    const rows = [];
    if (item.downloadUrl) rows.push({ label: item.title || "Download", url: item.downloadUrl });
    if (item.transcriptUrl) rows.push({ label: `${item.title || "Lesson"} transcript`, url: item.transcriptUrl });
    (item.files || []).forEach((file) => rows.push({ label: file.filename || item.title || "Course file", url: file.url }));
    return rows;
  });
  $("[data-module-resources]").innerHTML = resources.length
    ? resources.map((item) => `<a class="resource-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.label)}</a>`).join("")
    : `<p class="supporting">Downloads and worksheets will appear here when Tiffany publishes them.</p>`;

  $$("[data-workbook-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("button", form);
    const status = $("[data-workbook-status]", form);
    const responses = $$("[data-workbook-response]", form).map((textarea) => textarea.value);
    button.disabled = true;
    status.textContent = "Saving…";
    try {
      const result = await api("save-workbook", {
        method: "POST",
        body: JSON.stringify({ contentId: form.dataset.workbookForm, week: Number(form.dataset.workbookWeek), responses }),
      });
      state.workbookResponses = result.workbookResponses || [];
      status.textContent = "Saved";
    } catch (error) {
      status.textContent = error.message;
    } finally { button.disabled = false; }
  }));
  $$("[data-workbook-section]").forEach((section) => section.addEventListener("toggle", () => {
    if (!section.open) return;
    $$("[data-workbook-section]", section.closest("[data-workbook-form]")).forEach((other) => {
      if (other !== section) other.open = false;
    });
  }));
  $$("[data-video-complete]").forEach((input) => input.addEventListener("change", async () => {
    input.disabled = true;
    try {
      const result = await api("save-activity", {
        method: "POST",
        body: JSON.stringify({ week: Number(input.dataset.videoWeek), activityType: "Lesson accessed", contentId: input.dataset.videoComplete, completed: input.checked }),
      });
      state.activity = result.activity;
      renderModule(week);
      renderDashboard();
      renderCurriculum();
    } catch (error) {
      input.checked = !input.checked;
      alert(error.message);
    } finally { input.disabled = false; }
  }));

  $("[data-activity-list]").innerHTML = window.TCC_COURSE.activityTypes.filter((type) => type !== "Lesson accessed").map((type) => {
    const done = activityDone(week.number, type);
    const descriptions = {
      "Tool completed": `Work through the ${week.tool}.`,
      "Case exercise completed": "Apply the week’s lens to the fictional scenario.",
      "Implementation completed": "Practice one small behavior in your real work.",
      "Reflection completed": "What did I learn? What do I need? What can I release?",
    };
    return `
      <label class="activity">
        <input class="activity-check" type="checkbox" data-activity-type="${escapeHtml(type)}" ${done ? "checked" : ""}>
        <span><strong>${escapeHtml(type)}</strong><span>${escapeHtml(descriptions[type])}</span></span>
        <span class="pill">${done ? "Complete" : "Not started"}</span>
      </label>
    `;
  }).join("");

  $$("[data-activity-type]").forEach((input) => input.addEventListener("change", async () => {
    input.disabled = true;
    try {
      const result = await api("save-activity", {
        method: "POST",
        body: JSON.stringify({ week: week.number, activityType: input.dataset.activityType, completed: input.checked }),
      });
      state.activity = result.activity;
      renderModule(week);
      renderDashboard();
      renderCurriculum();
    } catch (error) {
      input.checked = !input.checked;
      alert(error.message);
    } finally { input.disabled = false; }
  }));

  const weekForms = state.profile.program === "Clinical Confidence Lab"
    ? Object.entries(window.TCC_LAB_FORMS || {}).filter(([key, form]) => Number(form.week) === Number(week.number) || (week.number === 1 && ["baseline", "success-plan"].includes(key)))
    : [];
  $("[data-week-form-list]").innerHTML = weekForms.length ? `
    <article class="card week-forms-card">
      <p class="eyebrow">Assessment Steps for Week ${week.number}</p>
      <h3>Go directly to what is due.</h3>
      <div class="week-form-buttons">
        ${weekForms.map(([key, form]) => {
          const complete = state.formResponses.some((response) => response.formKey === key);
          return `<button class="button ${complete ? "secondary" : ""}" data-open-course-form="${escapeHtml(key)}">${complete ? "Review" : "Complete"} ${escapeHtml(form.title)}</button>`;
        }).join("")}
      </div>
    </article>
  ` : "";
  $$("[data-open-course-form]").forEach((button) => button.addEventListener("click", () => {
    showView("assessments");
    openLabForm(button.dataset.openCourseForm);
  }));

  $("[data-milestone-card]").hidden = !week.milestone;
  if (week.milestone) {
    $("[data-milestone-title]").textContent = week.feedbackFocus;
    const existing = state.submissions.find((item) => Number(item.week) === week.number);
    const textarea = $("[data-milestone-form] textarea");
    textarea.value = existing?.submission || "";
    $("[data-milestone-status]").textContent = existing ? existing.status : "";
  }
};

const openWeek = async (weekNumber) => {
  const current = Number(state.profile.currentWeek || 1);
  if (weekNumber > current) return;
  state.selectedWeek = weekNumber;
  const week = window.TCC_COURSE.weeks[weekNumber - 1];
  renderModule(week);
  renderDashboard();
  renderCurriculum();
  showView("module");
};

const assessmentStatements = [
  ["Clinical Presence", "I can remain engaged when I do not immediately know what to say.", "I can tolerate silence without assuming I am failing.", "I notice when I am performing, rescuing, overexplaining, or shutting down.", "I can return my attention to the client after becoming self-conscious."],
  ["Clinical Reasoning", "I can explain why I chose an intervention or question.", "I can identify what matters most in a clinical moment.", "I can distinguish an urgent issue from an uncomfortable issue.", "I know when to continue, slow down, consult, document, refer, or escalate."],
  ["Session Structure", "I have a flexible way to open, explore, intervene, and close sessions.", "I can redirect a session without feeling controlling.", "I can bring a session back to a treatment thread.", "I can end sessions with enough time for grounding and next steps."],
  ["Boundaries and Responsibility", "I can be caring without taking responsibility for a client’s outcome.", "I can hold time, communication, cancellation, and fee boundaries.", "I can receive disappointment or feedback without immediately over-apologizing.", "I can recognize when a case requires consultation or support beyond me."],
  ["Sustainability and Professional Identity", "I have a reliable way to transition out of clinical work.", "I can identify what is draining me instead of calling all distress burnout.", "I can advocate for reasonable expectations in my work setting.", "I can describe the kind of therapist I am becoming without copying someone else."],
];

const renderAssessments = () => {
  const isLab = state.profile.program === "Clinical Confidence Lab";
  if (isLab) {
    const currentWeek = Number(state.profile.currentWeek || 1);
    const ordered = ["baseline", "success-plan", "pulse-1", "pulse-2", "pulse-3", "pulse-4", "post", "capstone", "call-prep"];
    $("[data-assessment-list]").innerHTML = ordered.map((key) => {
      const form = window.TCC_LAB_FORMS[key];
      const available = !form.week || currentWeek >= form.week;
      const complete = state.formResponses.some((response) => response.formKey === key);
      return `
        <article class="assessment-domain">
          <p class="eyebrow">${complete ? "Saved" : available ? form.eyebrow : `Opens Week ${form.week}`}</p>
          <h3>${escapeHtml(form.title)}</h3>
          <p class="supporting">${escapeHtml(form.description)}</p>
          <button class="button ${available ? "" : "secondary"}" data-lab-form="${escapeHtml(key)}" ${available ? "" : "disabled"}>${complete ? "Review / Update" : "Begin"}</button>
        </article>
      `;
    }).join("");
    $$("[data-lab-form]").forEach((button) => button.addEventListener("click", () => openLabForm(button.dataset.labForm)));
    return;
  }
  const cards = isLab ? [
    { key: "baseline", title: "Baseline Assessment", available: true, complete: state.profile.baselineComplete },
    { key: "final", title: "Final Assessment + 30-Day Plan", available: Number(state.profile.currentWeek) >= 4, complete: state.profile.finalComplete },
  ] : [
    { key: "baseline", title: "Baseline Assessment", available: true, complete: state.profile.baselineComplete },
    { key: "midpoint", title: "Midpoint Progress Pulse", available: Number(state.profile.currentWeek) >= 6, complete: state.profile.midpointComplete },
    { key: "final", title: "Final Assessment + Integration", available: Number(state.profile.currentWeek) >= 12, complete: state.profile.finalComplete },
  ];
  $("[data-assessment-list]").innerHTML = cards.map((card) => `
    <article class="assessment-domain">
      <p class="eyebrow">${card.complete ? "Complete" : card.available ? "Available now" : "Opens later"}</p>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="supporting">${card.key === "baseline" ? "Rate your experience during the past four weeks. Honest answers make the program more useful." : "Compare behavior, clinical reasoning, and what support you still need."}</p>
      <button class="button ${card.available ? "" : "secondary"}" data-assessment="${card.key}" ${card.available ? "" : "disabled"}>${card.complete ? "Review / Retake" : "Begin Assessment"}</button>
    </article>
  `).join("");
  $$("[data-assessment]").forEach((button) => button.addEventListener("click", () => openAssessment(button.dataset.assessment)));
};

const renderCourseFormField = (field, value) => {
  if (field.type === "text") return `<label>${escapeHtml(field.label)}<textarea name="${escapeHtml(field.key)}" required>${escapeHtml(value || "")}</textarea></label>`;
  if (field.type === "acknowledgement") return `<label class="form-ack"><input type="checkbox" name="${escapeHtml(field.key)}" ${value === true ? "checked" : ""} required><span>${escapeHtml(field.label)}</span></label>`;
  const options = field.type === "choice" ? field.options : Array.from({ length: field.max - field.min + 1 }, (_, index) => field.min + index);
  return `
    <fieldset class="course-rating">
      <legend>${escapeHtml(field.label)}</legend>
      ${field.help ? `<p>${escapeHtml(field.help)}</p>` : ""}
      <div class="course-rating-options">
        ${options.map((option) => `<label><input type="radio" name="${escapeHtml(field.key)}" value="${escapeHtml(option)}" ${String(value ?? "") === String(option) ? "checked" : ""} required><span>${escapeHtml(option)}</span></label>`).join("")}
      </div>
    </fieldset>
  `;
};

const openLabForm = (formKey) => {
  const definition = window.TCC_LAB_FORMS?.[formKey];
  if (!definition) return;
  const saved = state.formResponses.find((response) => response.formKey === formKey);
  const container = $("[data-assessment-list]");
  container.innerHTML = `
    <form class="course-form" data-course-form="${escapeHtml(formKey)}">
      <section class="assessment-domain course-form-intro">
        <p class="eyebrow">${escapeHtml(definition.eyebrow)}</p>
        <h3>${escapeHtml(definition.title)}</h3>
        <p class="supporting">${escapeHtml(definition.description)}</p>
        <div class="warning">Use fictional, composite, or fully de-identified examples only. For risk, ethics, law, scope, competence, or workplace policy, use formal supervision and required procedures.</div>
      </section>
      ${definition.fields.map((field) => `<section class="assessment-domain">${renderCourseFormField(field, saved?.responses?.[field.key])}</section>`).join("")}
      <section class="assessment-domain form-actions"><button class="button" type="submit">Save ${escapeHtml(definition.title)}</button><span data-course-form-status></span></section>
    </form>
  `;
  $("[data-course-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button", form);
    const status = $("[data-course-form-status]", form);
    const formData = new FormData(form);
    const responses = Object.fromEntries(definition.fields.map((field) => [field.key, field.type === "acknowledgement" ? formData.get(field.key) === "on" : formData.get(field.key)]));
    button.disabled = true;
    status.textContent = "Saving…";
    try {
      const result = await api("save-course-form", { method: "POST", body: JSON.stringify({ formKey, responses }) });
      state.formResponses = result.formResponses || [];
      state.profile = result.profile || state.profile;
      status.textContent = "Saved";
      renderDashboard();
      renderCurriculum();
    } catch (error) {
      status.textContent = error.message;
    } finally { button.disabled = false; }
  });
};

const openAssessment = (kind) => {
  const container = $("[data-assessment-list]");
  container.innerHTML = `
    <form data-assessment-form>
      ${assessmentStatements.map((domain, domainIndex) => `
        <section class="assessment-domain">
          <h3>${escapeHtml(domain[0])}</h3>
          ${domain.slice(1).map((statement, statementIndex) => {
            const name = `rating-${domainIndex}-${statementIndex}`;
            return `<div class="rating-row"><p>${escapeHtml(statement)}</p><div class="rating-options">
              ${[1,2,3,4,5].map((rating) => `<label>${rating}<input type="radio" name="${name}" value="${rating}" required></label>`).join("")}
            </div></div>`;
          }).join("")}
        </section>
      `).join("")}
      <section class="assessment-domain">
        <label>What do you want to be able to do more consistently?<textarea name="goal" required></textarea></label>
        <div class="form-actions"><button class="button" type="submit">Save Assessment</button><span data-assessment-status></span></div>
      </section>
    </form>
  `;
  $("[data-assessment-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button", form);
    button.disabled = true;
    const formData = new FormData(form);
    const ratings = [...formData.entries()].filter(([key]) => key.startsWith("rating-")).map(([, value]) => Number(value));
    try {
      const result = await api("save-assessment", { method: "POST", body: JSON.stringify({ kind, ratings, goal: formData.get("goal") }) });
      state.activity = result.activity;
      state.profile = result.profile;
      renderAssessments();
      renderDashboard();
    } catch (error) {
      $("[data-assessment-status]", form).textContent = error.message;
    } finally { button.disabled = false; }
  });
};

const renderQuestions = () => {
  $("[data-question-history]").innerHTML = state.questions.length ? state.questions.map((item) => `
    <article class="card queue-card">
      <p class="eyebrow">${escapeHtml(item.status)}</p>
      <h3>${escapeHtml(item.question)}</h3>
      ${item.response ? `<p><strong>Tiffany:</strong> ${escapeHtml(item.response)}</p>` : `<p>Submitted ${escapeHtml(item.submittedAt || "")}. You’ll see Tiffany’s response here.</p>`}
    </article>
  `).join("") : `<p class="supporting">You have not submitted any questions yet.</p>`;
};

const initializeApp = async () => {
  const result = await api("me");
  state.profile = result.profile;
  state.activity = result.activity || [];
  state.submissions = result.submissions || [];
  state.questions = result.questions || [];
  state.content = result.content || [];
  state.workbookResponses = result.workbookResponses || [];
  state.formResponses = result.formResponses || [];
  setCourseForProfile();
  $("[data-login-view]").hidden = true;
  $("[data-app]").hidden = false;
  $("[data-user-name]").textContent = state.profile.name || "Course Member";
  $("[data-user-email]").textContent = state.profile.email;
  $("[data-admin-link]").hidden = state.profile.role !== "Admin";
  renderDashboard();
  renderCurriculum();
  renderAssessments();
  renderQuestions();
};

$("[data-login-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("button", form);
  const status = $("[data-login-status]");
  const formData = new FormData(form);
  button.disabled = true;
  status.textContent = "";
  try {
    const response = await fetch(AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "We could not sign you in.");
    saveSession(result);
    await initializeApp();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});

$$("[data-view-button]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewButton)));
$$("[data-access-tab]").forEach((button) => button.addEventListener("click", () => setAccessMode(button.dataset.accessTab)));
$("[data-show-curriculum]").addEventListener("click", () => showView("curriculum"));
$("[data-open-assessments]").addEventListener("click", () => showView("assessments"));
$("[data-open-current]").addEventListener("click", () => openWeek(Number(state.profile.currentWeek || 1)));
$("[data-sign-out]").addEventListener("click", signOut);

$("[data-milestone-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("button", form);
  const status = $("[data-milestone-status]");
  button.disabled = true;
  try {
    const week = window.TCC_COURSE.weeks[state.selectedWeek - 1];
    const result = await api("save-milestone", { method: "POST", body: JSON.stringify({ week: week.number, milestone: week.feedbackFocus, submission: form.submission.value }) });
    state.submissions = result.submissions;
    status.textContent = "Submitted. Tiffany will respond within three business days.";
    renderDashboard();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});

$("[data-question-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("button", form);
  const status = $("[data-question-status]");
  button.disabled = true;
  try {
    const result = await api("save-question", { method: "POST", body: JSON.stringify({ question: form.question.value }) });
    state.questions = result.questions;
    form.reset();
    status.textContent = "Your question was sent.";
    renderQuestions();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});

$("[data-activation-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("button", form);
  const status = $("[data-login-status]");
  button.disabled = true;
  status.textContent = "";
  try {
    const response = await fetch(ACTIVATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: new FormData(form).get("email") }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "We could not send the activation email.");
    status.textContent = result.message;
    status.style.color = "var(--sage)";
    form.reset();
  } catch (error) {
    status.style.color = "var(--danger)";
    status.textContent = error.message;
  } finally { button.disabled = false; }
});

const initializePreview = () => {
  state.profile = {
    name: "Tiffany Preview",
    email: "preview@theconfidentclinician.me",
    role: "Admin",
    program: "Clinical Confidence Lab",
    programWeeks: 4,
    cohort: "Founding Beta · September 2026",
    enrollmentStatus: "Active",
    currentWeek: 3,
    baselineComplete: true,
    midpointComplete: false,
    finalComplete: false,
  };
  state.activity = [
    ...window.TCC_COURSE.activityTypes.map((activityType, index) => ({ week: 1, activityType, completed: true, id: `preview-1-${index}` })),
    ...window.TCC_COURSE.activityTypes.map((activityType, index) => ({ week: 2, activityType, completed: true, id: `preview-2-${index}` })),
    { week: 3, activityType: "Lesson accessed", completed: true, id: "preview-3-1" },
    { week: 3, activityType: "Tool completed", completed: true, id: "preview-3-2" },
  ];
  state.submissions = [
    { week: 1, milestone: "Confidence Block Inventory", submission: "Preview submission", status: "Feedback returned", feedback: "You identified the pattern clearly. Keep the experiment small and observable." },
  ];
  state.questions = [];
  state.content = [];
  state.workbookResponses = [];
  state.formResponses = [];
  setCourseForProfile();
  $("[data-login-view]").hidden = true;
  $("[data-app]").hidden = false;
  $("[data-user-name]").textContent = state.profile.name;
  $("[data-user-email]").textContent = "Interactive preview";
  $("[data-admin-link]").hidden = true;
  renderDashboard();
  renderCurriculum();
  renderAssessments();
  renderQuestions();
};

if (isPreview) initializePreview();
else if (readSession()) initializeApp().catch(signOut);
