const API = "/.netlify/functions/course-api";
const SESSION_KEY = "tccCourseSession";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
let token = "";
let data = { participants: [], submissions: [], questions: [] };

try { token = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}").accessToken || ""; } catch {}
if (!token) window.location.replace("/course/");

const request = async (action, options = {}) => {
  const response = await fetch(`${API}?action=${action}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    window.location.replace("/course/");
    throw new Error("Admin access is required.");
  }
  if (!response.ok) throw new Error(result.message || "The admin dashboard could not load.");
  return result;
};

const showPanel = (name) => {
  $$("[data-admin-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === name));
  $$("[data-admin-view]").forEach((button) => button.classList.toggle("active", button.dataset.adminView === name));
};

const render = () => {
  const active = data.participants.filter((person) => person.enrollmentStatus === "Active").length;
  const attention = data.participants.filter((person) => person.needsAttention).length;
  const feedback = data.submissions.filter((item) => item.status !== "Feedback returned").length;
  const questions = data.questions.filter((item) => item.status !== "Answered").length;
  $("[data-admin-metrics]").innerHTML = [
    [active, "Active participants"], [attention, "Need attention"], [feedback, "Feedback due"], [questions, "Open questions"],
  ].map(([value, label]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");

  $("[data-participant-rows]").innerHTML = data.participants.length ? data.participants.map((person) => `
    <tr>
      <td><strong>${escapeHtml(person.name || "Unnamed")}</strong><br><small>${escapeHtml(person.email)}</small></td>
      <td><span class="pill ${person.needsAttention ? "attention" : ""}">${escapeHtml(person.needsAttention ? "Needs attention" : person.enrollmentStatus || "Active")}</span></td>
      <td>${person.currentWeek || 1}</td><td>${Math.round((person.overallProgress || 0) * 100)}%</td>
      <td>${person.modulesAccessed || 0}/12</td><td>${person.milestonesSubmitted || 0}/6</td>
      <td>${person.mentorshipAttended || 0}/6</td><td>${escapeHtml(person.lastActive || "—")}</td>
    </tr>
  `).join("") : `<tr><td colspan="8">No participants have been added yet.</td></tr>`;

  $("[data-submission-queue]").innerHTML = data.submissions.length ? data.submissions.map((item) => `
    <article class="card queue-card">
      <p class="eyebrow">Week ${item.week} · ${escapeHtml(item.status)}</p>
      <h3>${escapeHtml(item.milestone)}</h3>
      <p><strong>${escapeHtml(item.participantEmail)}</strong></p>
      <p>${escapeHtml(item.submission)}</p>
      <form data-feedback-form="${item.id}">
        <label>Your feedback<textarea name="feedback" required>${escapeHtml(item.feedback || "")}</textarea></label>
        <button class="button small" type="submit">Return Feedback</button>
      </form>
    </article>
  `).join("") : `<p class="supporting">No milestone submissions yet.</p>`;

  $("[data-admin-questions]").innerHTML = data.questions.length ? data.questions.map((item) => `
    <article class="card queue-card">
      <p class="eyebrow">${escapeHtml(item.status)}</p>
      <h3>${escapeHtml(item.participantEmail)}</h3>
      <p>${escapeHtml(item.question)}</p>
      <form data-response-form="${item.id}">
        <label>Your response<textarea name="response" required>${escapeHtml(item.response || "")}</textarea></label>
        <button class="button small" type="submit">Send Response</button>
      </form>
    </article>
  `).join("") : `<p class="supporting">No questions yet.</p>`;

  $$("[data-feedback-form]").forEach((form) => form.addEventListener("submit", (event) => saveResponse(event, "save-feedback", "feedback")));
  $$("[data-response-form]").forEach((form) => form.addEventListener("submit", (event) => saveResponse(event, "answer-question", "response")));
};

const load = async () => {
  $("[data-admin-status]").textContent = "";
  try {
    data = await request("admin-dashboard");
    render();
  } catch (error) { $("[data-admin-status]").textContent = error.message; }
};

const saveResponse = async (event, action, field) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("button", form);
  button.disabled = true;
  const id = form.dataset.feedbackForm || form.dataset.responseForm;
  try {
    await request(action, { method: "POST", body: JSON.stringify({ id, [field]: form[field].value }) });
    await load();
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; }
};

$$("[data-admin-view]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.adminView)));
$("[data-refresh]").addEventListener("click", load);
load();
