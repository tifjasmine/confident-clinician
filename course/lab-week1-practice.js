/* Week 1 practice, rebuilt (Nov 7):
   - Clinical Blind Spot Lab: Spot It, Seen vs. Supplied, The Pull, P.A.U.S.E. + your move, fresh rep.
   - The Advice Request: Client Reacts (Jordan answers your purpose), It Shifts, Rewind, one reflection, then the breakdown.
   All client lines below are fictional DRAFT wording for Tiffany's clinical review. No scores or grades. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const go = name => window.TCCShowCourseScreen?.(name);
const top = () => scrollTo({ top: 0, behavior: "smooth" });

/* ================= Clinical Blind Spot Lab ================= */
const B_KEY = "tcc-w1-blind-v2";
const maya = {
  who: "Maya, 34", when: "Fourth session",
  setup: "You ask how the conversation with her manager went.",
  lines: [
    ["m1", "stage", "laughs, glances at her phone"],
    ["m2", "say", "Oh, fine. I mean, I didn’t really bring it up."],
    ["m3", "say", "It’s fine. It’s not a big deal."],
    ["m4", "stage", "pause"],
    ["m5", "say", "Anyway, my sister’s visiting this weekend, so that’ll be a whole thing."],
    ["m6", "stage", "quieter"],
    ["m7", "say", "Sorry. I know I said I’d do it."],
    ["m8", "say", "You probably think I’m hopeless."]
  ]
};
const noticed = [
  ["The laugh and the phone", "A light tone over something that may feel heavier."],
  ["“It’s fine” twice", "Repeating it can be a way of closing the topic."],
  ["The jump to her sister", "She changed direction right after naming what didn’t happen."],
  ["The quieter apology", "She apologizes to you, not just about the task."],
  ["“You probably think I’m hopeless”", "A prediction about what you think. It puts you in the room."]
];
const sortItems = [
  ["She didn’t raise it with her manager.", "seen", "She told you this directly."],
  ["She laughed and looked at her phone.", "seen", "You could see it happen."],
  ["She changed the subject.", "seen", "She moved to her sister without being asked."],
  ["She’s avoiding conflict.", "added", "Plausible, but she hasn’t said it. Worth checking, not assuming."],
  ["She’s embarrassed.", "added", "The laugh and apology might fit. They might not. Ask."],
  ["She expects you to judge her.", "added", "She said “you probably think,” but what she expects is still your guess."]
];
const pulls = [
  ["Reassure her she isn’t hopeless", "Warm, and it can quietly close the door on the fear she just named."],
  ["Fix the manager problem", "Useful later. Right now it skips what not doing it meant to her."],
  ["Follow her to the sister topic", "Respects her lead, and leaves the moment that just mattered behind."],
  ["Explain that change takes time", "True, and it teaches instead of asks."],
  ["Something else", ""]
];
const takes = [
  ["Name what happened", "You laughed when you said it wasn’t a big deal. What’s it like to say that out loud?"],
  ["Get curious about the fear", "You said I probably think you’re hopeless. What made you expect that?"],
  ["Choose together", "We could talk about your sister, or the conversation that didn’t happen. Which matters more today?"]
];
const devon = { who: "Devon, 52", when: "First session · arms folded", line: "My wife made me come. I don’t really see the point, but go ahead, ask your questions." };
const ROUNDS = ["Spot it", "Seen or supplied", "The pull", "Your move", "Fresh rep"];

let B = load(B_KEY) || {};
const bDefaults = () => ({ round: 1, taps: [], first: "", revealed: false, sort: {}, check: "", pull: "", pullOther: "", miss: "", line: "", takes: false, closest: "", revised: "", d: { notice: "", pull: "", say: "" }, done: false, saved: false });
B = Object.assign(bDefaults(), B);
const saveB = () => store(B_KEY, B);

const momentPanel = (m, interactive) => `<aside class="moment">
  <p class="moment-who"><span>${esc(m.who)}</span>${esc(m.when)}</p>
  <p class="moment-setup">${esc(m.setup)}</p>
  <div class="moment-lines">${m.lines.map(([id, kind, text]) => kind === "stage"
    ? `<button type="button" class="moment-stage${B.taps.includes(id) ? " tapped" : ""}" ${interactive ? `data-tap="${id}"` : "disabled"}>(${esc(text)})</button>`
    : `<button type="button" class="moment-say${B.taps.includes(id) ? " tapped" : ""}" ${interactive ? `data-tap="${id}"` : "disabled"}>“${esc(text)}”</button>`).join(" ")}</div>
</aside>`;

function bRail() {
  return `<nav class="round-rail" aria-label="Blind Spot Lab rounds">${ROUNDS.map((r, i) => `<button type="button" class="${i + 1 === B.round ? "active" : ""} ${i + 1 < B.round || B.done ? "complete" : ""}" data-b-round="${i + 1}" ${i + 1 > B.round ? "disabled" : ""}><b>${i + 1}</b><span>${r}</span></button>`).join("")}</nav>`;
}

function blindBody() {
  const r = B.round;
  if (r === 1) return `${momentPanel(maya, true)}<div class="task">
    <p class="eyebrow">Round 1 · Spot it</p><h2>Tap what caught your <em>attention.</em></h2>
    <p class="task-sub">Words, pauses, stage directions. Anything that made you lean in.</p>
    <label>What stood out first, and why that?<textarea data-b="first" rows="3" placeholder="One or two sentences…">${esc(B.first)}</textarea></label>
    ${B.revealed ? `<div class="reveal"><p class="eyebrow">What other clinicians noticed</p><ul>${noticed.map(([a, b]) => `<li><strong>${a}</strong>${b}</li>`).join("")}</ul></div>` : ""}
    <p class="form-error" role="alert"></p>
    <div class="task-actions">${B.revealed ? `<button class="primary" data-b-next>Next round →</button>` : `<button class="primary" data-b-reveal>See what others noticed</button>`}</div></div>`;
  if (r === 2) {
    const allSorted = sortItems.every((_, i) => B.sort[i]);
    return `${momentPanel(maya, false)}<div class="task">
    <p class="eyebrow">Round 2 · Seen or supplied</p><h2>Did Maya say it, or did <em>you</em> add it?</h2>
    <div class="sort-list">${sortItems.map(([s, ans, why], i) => { const pick = B.sort[i]; return `<div class="sort-row${pick ? " picked" : ""}">
      <p>${esc(s)}</p><div class="sort-btns"><button type="button" class="${pick === "seen" ? "selected" : ""}" data-sort="${i}" data-val="seen">She said or did it</button><button type="button" class="${pick === "added" ? "selected" : ""}" data-sort="${i}" data-val="added">I added it</button></div>
      ${pick ? `<p class="sort-note ${pick === ans ? "match" : "look"}">${pick === ans ? "Yes. " : "Look again. "}${esc(why)}</p>` : ""}</div>`; }).join("")}</div>
    ${allSorted ? `<label>Which guess would you most want to check with her, and how would you ask?<textarea data-b="check" rows="3" placeholder="The guess, then the question you’d ask…">${esc(B.check)}</textarea></label>` : ""}
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${allSorted ? `<button class="primary" data-b-next>Next round →</button>` : ""}</div></div>`;
  }
  if (r === 3) {
    const p = pulls.find(x => x[0] === B.pull);
    return `${momentPanel({ ...maya, lines: maya.lines.slice(6) , setup: "The moment that lands on you:" }, false)}<div class="task">
    <p class="eyebrow">Round 3 · The pull</p><h2>“You probably think I’m <em>hopeless.</em>”</h2>
    <p class="task-sub">Be honest. What do you feel pulled to do in the next second?</p>
    <div class="pick-list">${pulls.map(([label]) => `<button type="button" class="${B.pull === label ? "selected" : ""}" data-pull="${esc(label)}">${esc(label)}</button>`).join("")}</div>
    ${B.pull === "Something else" ? `<label>Name the pull<input type="text" data-b="pullOther" value="${esc(B.pullOther)}" placeholder="e.g. Change the subject so she feels better"></label>` : ""}
    ${p && p[1] ? `<p class="pull-note">${esc(p[1])}</p>` : ""}
    ${B.pull ? `<label>If you followed that pull right now, what might Maya miss?<textarea data-b="miss" rows="3" placeholder="One honest sentence…">${esc(B.miss)}</textarea></label>` : ""}
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${B.pull ? `<button class="primary" data-b-next>Next round →</button>` : ""}</div></div>`;
  }
  if (r === 4) return `${momentPanel(maya, false)}<div class="task">
    <p class="eyebrow">Round 4 · P.A.U.S.E., then your move</p><h2>Pause. Say it out loud. <em>Then</em> type it.</h2>
    <p class="task-sub">Pause · Attend · Use what you know · Say one purposeful thing · Explore what follows.</p>
    <label>What you said<textarea data-b="line" rows="3" placeholder="One natural sentence, not a perfect script…">${esc(B.line)}</textarea></label>
    ${B.takes ? `<div class="takes"><p class="eyebrow">Three clinician takes · different purposes, none “the answer”</p>${takes.map(([p, t]) => `<div class="take"><span>${p}</span><blockquote>“${esc(t)}”</blockquote></div>`).join("")}</div>
      <p class="task-q">Which purpose was closest to yours?</p><div class="pick-list inline">${[...takes.map(t => t[0]), "None of these"].map(l => `<button type="button" class="${B.closest === l ? "selected" : ""}" data-closest="${esc(l)}">${esc(l)}</button>`).join("")}</div>
      <label>Keep your line, or change it? <small>Optional</small><textarea data-b="revised" rows="2" placeholder="Your revised line, if you’d change it…">${esc(B.revised)}</textarea></label>` : ""}
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${B.takes ? `<button class="primary" data-b-next>Next round →</button>` : `<button class="primary" data-b-takes>See three clinician takes</button>`}</div></div>`;
  if (r === 5) return `<aside class="moment"><p class="moment-who"><span>${devon.who}</span>${devon.when}</p><p class="moment-setup">A new client. Less help this time.</p><div class="moment-lines"><span class="moment-say solo">“${esc(devon.line)}”</span></div></aside><div class="task">
    <p class="eyebrow">Round 5 · Fresh rep</p><h2>Same skill, new <em>room.</em></h2>
    <div class="rep-fields">
      <label>What do you notice?<input type="text" data-bd="notice" value="${esc(B.d.notice)}"></label>
      <label>What pull do you feel?<input type="text" data-bd="pull" value="${esc(B.d.pull)}"></label>
      <label>What would you say? <small>Say it out loud first</small><textarea data-bd="say" rows="3">${esc(B.d.say)}</textarea></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button><button class="primary" data-b-finish>Finish the lab</button></div></div>`;
  return "";
}

function renderBlind() {
  const host = $("[data-week1-blind-spot]"); if (!host) return;
  if (B.done) {
    const pull = B.pull === "Something else" ? (B.pullOther || "Something else") : B.pull;
    host.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
      <article class="pattern-card"><p class="eyebrow">Week 1 · Clinical Blind Spot Lab</p><h1>Your pattern this <em>week.</em></h1>
      <div class="pattern-grid">
        <div><span>The pull you felt</span><p>${esc(pull)}</p></div>
        <div><span>What you’d say to Maya</span><p>“${esc(B.revised || B.line)}”</p></div>
        <div><span>With Devon</span><p>“${esc(B.d.say)}”</p></div>
      </div>
      <div class="task-actions"><button class="secondary" data-b-restart>Practice again</button><button class="primary" data-b-save>${B.saved ? "Saved ✓ Open my profile →" : "Save to my Confidence Profile →"}</button></div></article></div>`;
    $("[data-b-restart]", host).onclick = () => { B = bDefaults(); saveB(); renderBlind(); top(); };
    $("[data-b-save]", host).onclick = () => { B.saved = true; saveB(); renderProfileEvidence(); go("w1-profile"); };
    bindGo(host); return;
  }
  host.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Train</p><h1>Clinical Blind Spot <em>Lab</em></h1><p>Notice what’s really in the room, including what’s happening in you, before you respond.</p></header>
    ${bRail()}<article class="practice-stage">${blindBody()}</article></div>`;
  bindBlind(host);
}

function need(host, ok, msg) { if (!ok) { const e = $(".form-error", host); if (e) e.textContent = msg; } return ok; }
function bindGo(host) { $$("[data-go]", host).forEach(b => b.onclick = () => go(b.dataset.go)); }

function bindBlind(host) {
  bindGo(host);
  $$("[data-tap]", host).forEach(b => b.onclick = () => { const id = b.dataset.tap; B.taps = B.taps.includes(id) ? B.taps.filter(x => x !== id) : [...B.taps, id]; saveB(); b.classList.toggle("tapped"); });
  $$("[data-b]", host).forEach(t => t.oninput = () => { B[t.dataset.b] = t.value; saveB(); });
  $$("[data-bd]", host).forEach(t => t.oninput = () => { B.d[t.dataset.bd] = t.value; saveB(); });
  $$("[data-b-round]", host).forEach(b => b.onclick = () => { B.round = +b.dataset.bRound; saveB(); renderBlind(); });
  $("[data-b-reveal]", host)?.addEventListener("click", () => { if (!need(host, B.taps.length && B.first.trim().length > 2, "Tap at least one moment and add a sentence first.")) return; B.revealed = true; saveB(); renderBlind(); });
  $$("[data-sort]", host).forEach(b => b.onclick = () => { B.sort[b.dataset.sort] = b.dataset.val; saveB(); renderBlind(); });
  $$("[data-pull]", host).forEach(b => b.onclick = () => { B.pull = b.dataset.pull; saveB(); renderBlind(); });
  $$("[data-closest]", host).forEach(b => b.onclick = () => { B.closest = b.dataset.closest; saveB(); renderBlind(); });
  $("[data-b-takes]", host)?.addEventListener("click", () => { if (!need(host, B.line.trim().length > 2, "Say it out loud, then type what you said.")) return; B.takes = true; saveB(); renderBlind(); });
  $("[data-b-back]", host)?.addEventListener("click", () => { B.round = Math.max(1, B.round - 1); saveB(); renderBlind(); top(); });
  $("[data-b-next]", host)?.addEventListener("click", () => {
    const r = B.round;
    if (r === 2 && !need(host, B.check.trim().length > 2, "Name one guess you’d check, and how.")) return;
    if (r === 3 && !need(host, B.miss.trim().length > 2, "Add one sentence about what she might miss.")) return;
    B.round = r + 1; saveB(); renderBlind(); top();
  });
  $("[data-b-finish]", host)?.addEventListener("click", () => { if (!need(host, B.d.say.trim().length > 2, "Add what you would say to Devon.")) return; B.done = true; saveB(); renderBlind(); top(); });
}

function renderProfileEvidence() {
  const panel = $('[data-screen-panel="w1-profile"] .advanced-shell'); if (!panel) return;
  let box = $("[data-profile-evidence]", panel);
  if (!B.saved) { box?.remove(); return; }
  if (!box) { box = document.createElement("aside"); box.dataset.profileEvidence = ""; box.className = "profile-evidence"; $(".advanced-head", panel).after(box); }
  const pull = B.pull === "Something else" ? (B.pullOther || "Something else") : B.pull;
  box.innerHTML = `<p class="eyebrow">From your Blind Spot Lab</p><div><span>Your pull</span><p>${esc(pull)}</p></div><div><span>Your line</span><p>“${esc(B.revised || B.line)}”</p></div>`;
}

/* ================= The Advice Request ================= */
const A_KEY = "tcc-w1-advice-v2";
const jordanLine = "Just tell me what to do. You’re the therapist. Should I break up with them?";
const beat1 = [
  ["opinion", "Give my honest opinion", "(goes quiet) So you think I should leave. My mom says that too. I guess everyone thinks I’m stupid for staying.", "Your view lands as a verdict. Jordan defers, and feels judged."],
  ["reassure", "Reassure them they’ll know when they’re ready", "That’s what everyone says. I’ve been ‘not ready’ for a year.", "Reassurance closes the door it meant to open."],
  ["explore", "Explore what makes the decision so hard", "I don’t know… every time I picture leaving, I feel like I’m failing them.", "It opens the real material: guilt and loyalty."],
  ["safety", "Slow down and ask about safety and context", "Safe? I mean… they yell sometimes. They go through my phone. Is that… a thing?", "It surfaces information that changes the work."]
];
const shiftLine = "I’m paying you because I can’t make decisions on my own.";
const beat2 = [
  ["pattern", "Name the pattern", "(pauses) Yeah… I ask everyone. My partner decides most things, honestly.", "Naming it gently brings up who usually decides."],
  ["alone", "Explore what deciding alone feels like", "Terrifying. If I choose wrong, it’s all on me.", "It opens the fear underneath the request."],
  ["role", "Clarify your role", "(exhales) Okay. That’s… kind of a relief. I don’t want you to choose. I just don’t want to be alone in it.", "A clear role steadies the room without taking over."],
  ["assess", "Check safety and freedom first", "If I’m honest, I’m not sure I’m allowed to decide much. They get really angry when I make plans without them.", "Asking directly surfaced possible control. Assessment and safety come before relationship decisions."]
];
const STEPS = ["Your move", "It shifts", "Rewind", "Reflect", "Done"];
let A = load(A_KEY) || {};
const aDefaults = () => ({ step: 1, b1: "", line: "", b2: "", rw: "", reflect: "", saved: false });
A = Object.assign(aDefaults(), A);
const saveA = () => store(A_KEY, A);
const find = (list, id) => list.find(x => x[0] === id);

const jordanPanel = (extra = "") => `<aside class="moment"><p class="moment-who"><span>Jordan, 29</span>Third session</p>
  <p class="moment-setup">Exhausted after another argument with their partner. The relationship has felt draining for months. No safety screening has been done yet.</p>
  <div class="moment-lines"><span class="moment-say solo">“${esc(jordanLine)}”</span></div>${extra}</aside>`;
const reply = (who, text, shows) => `<div class="client-reply"><span class="reply-who">${who}</span><blockquote>${esc(text).replace(/^\(([^)]*)\)/, '<i>($1)</i>')}</blockquote>${shows ? `<p class="reply-shows">${esc(shows)}</p>` : ""}</div>`;

function adviceBody() {
  const s = A.step, p1 = find(beat1, A.b1), p2 = find(beat2, A.b2), rw = find(beat1, A.rw);
  if (s === 1) return `${jordanPanel()}<div class="task">
    <p class="eyebrow">Beat 1 · Your move</p><h2>What’s the <em>purpose</em> of your next move?</h2>
    <p class="task-sub">Pick the purpose. Jordan will respond to what you actually do.</p>
    <div class="pick-list">${beat1.map(([id, label]) => `<button type="button" class="${A.b1 === id ? "selected" : ""}" data-b1="${id}">${esc(label)}</button>`).join("")}</div>
    ${A.b1 ? `<label>Your line <small>Say it out loud first · optional</small><input type="text" data-a="line" value="${esc(A.line)}" placeholder="What you’d actually say…"></label>${reply("Jordan", p1[2], p1[3])}` : ""}
    <p class="form-error" role="alert"></p><div class="task-actions">${A.b1 ? `<button class="primary" data-a-next>Keep going →</button>` : ""}</div></div>`;
  if (s === 2) return `${jordanPanel(`<div class="moment-path"><span>You chose</span>${esc(p1[1])}</div>`)}<div class="task">
    <p class="eyebrow">Beat 2 · It shifts</p><p class="task-sub">A few minutes later, Jordan says:</p><h2 class="said">“${esc(shiftLine)}”</h2>
    <p class="task-q">What’s your purpose now?</p>
    <div class="pick-list">${beat2.map(([id, label]) => `<button type="button" class="${A.b2 === id ? "selected" : ""}${A.b1 === "safety" && id === "assess" ? " suggested" : ""}" data-b2="${id}">${esc(label)}${A.b1 === "safety" && id === "assess" ? "<small>Given what Jordan just shared</small>" : ""}</button>`).join("")}</div>
    ${A.b2 === "role" ? `<p class="your-line">You: “I won’t choose for you, and I won’t leave you alone with it.”</p>` : ""}
    ${p2 ? reply("Jordan", p2[2], p2[3]) : ""}
    <p class="form-error" role="alert"></p><div class="task-actions"><button class="secondary" data-a-back>← Back</button>${A.b2 ? `<button class="primary" data-a-next>Rewind →</button>` : ""}</div></div>`;
  if (s === 3) return `${jordanPanel()}<div class="task">
    <p class="eyebrow">Beat 3 · Rewind</p><h2>Go back. Try a different <em>purpose.</em></h2>
    <p class="task-sub">Same question from Jordan. A different move from you.</p>
    <div class="pick-list">${beat1.filter(x => x[0] !== A.b1).map(([id, label]) => `<button type="button" class="${A.rw === id ? "selected" : ""}" data-rw="${id}">${esc(label)}</button>`).join("")}</div>
    ${rw ? `<div class="paths"><div><p class="eyebrow">First time</p><h3>${esc(p1[1])}</h3>${reply("Jordan", p1[2], "")}</div><div><p class="eyebrow">Rewind</p><h3>${esc(rw[1])}</h3>${reply("Jordan", rw[2], "")}</div></div>` : ""}
    <p class="form-error" role="alert"></p><div class="task-actions"><button class="secondary" data-a-back>← Back</button>${rw ? `<button class="primary" data-a-next>Reflect →</button>` : ""}</div></div>`;
  if (s === 4) return `<div class="task wide">
    <p class="eyebrow">Reflect</p><h2>What did Jordan’s reactions tell you about what the question was <em>really</em> asking?</h2>
    <textarea data-a="reflect" rows="4" placeholder="A few honest sentences…">${esc(A.reflect)}</textarea>
    <p class="form-error" role="alert"></p>
    <div class="breakdown"><p class="eyebrow">How clinicians think about it</p>
      <div class="bd-less"><strong>A less useful first move</strong><p>“Yes, you should probably leave.” It substitutes the therapist’s preference for collaborative exploration and bypasses safety and context.</p></div>
      <div class="bd-grid"><div><strong>Defensible response A</strong><p>“I can help you sort through it, but I don’t want to make a decision that belongs to you. What has been making staying or leaving so hard?”</p></div><div><strong>Defensible response B</strong><p>“Before we weigh options, I want to understand whether you feel safe and free to make decisions in this relationship.”</p></div></div>
      <p class="bd-note"><strong>Reasoning and boundary:</strong> Either can fit, depending on history and risk. When coercion or abuse is possible, assessment comes first. Ask; don’t presume. In real cases, bring this to supervision or consultation.</p></div>
    <div class="task-actions"><button class="secondary" data-a-back>← Back</button><button class="primary" data-a-next>Finish →</button></div></div>`;
  return `<div class="task wide"><p class="eyebrow">The Advice Request · Complete</p><h2>You practiced choosing a purpose, not a perfect <em>line.</em></h2>
    <div class="pattern-grid"><div><span>Your first move</span><p>${esc(p1[1])}${A.line ? `<br><em>“${esc(A.line)}”</em>` : ""}</p></div><div><span>When it shifted</span><p>${esc(p2[1])}</p></div><div><span>Your rewind</span><p>${esc(rw[1])}</p></div><div><span>What you took from it</span><p>${esc(A.reflect)}</p></div></div>
    <div class="task-actions"><button class="secondary" data-a-restart>Run it again</button><button class="primary" data-a-save>${A.saved ? "Saved ✓ Back to Week 1" : "Save to my Playbook"}</button></div></div>`;
}

function renderAdvice() {
  const panel = $('[data-screen-panel="case-advice"]'); if (!panel) return;
  panel.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Experience</p><h1>The Advice <em>Request</em></h1><p>Feel the pull to rescue, choose a purpose instead, and watch Jordan respond to what you actually did.</p></header>
    <nav class="round-rail" aria-label="Advice Request steps">${STEPS.map((x, i) => `<button type="button" class="${i + 1 === A.step ? "active" : ""} ${i + 1 < A.step ? "complete" : ""}" ${i + 1 < A.step ? `data-a-step="${i + 1}"` : "disabled"}><b>${i + 1}</b><span>${x}</span></button>`).join("")}</nav>
    <article class="practice-stage${A.step >= 4 ? " single" : ""}">${adviceBody()}</article></div>`;
  bindAdvice(panel);
}

function bindAdvice(host) {
  bindGo(host);
  $$("[data-a]", host).forEach(t => t.oninput = () => { A[t.dataset.a] = t.value; saveA(); });
  $$("[data-b1]", host).forEach(b => b.onclick = () => { A.b1 = b.dataset.b1; if (A.rw === A.b1) A.rw = ""; saveA(); renderAdvice(); });
  $$("[data-b2]", host).forEach(b => b.onclick = () => { A.b2 = b.dataset.b2; saveA(); renderAdvice(); });
  $$("[data-rw]", host).forEach(b => b.onclick = () => { A.rw = b.dataset.rw; saveA(); renderAdvice(); });
  $$("[data-a-step]", host).forEach(b => b.onclick = () => { A.step = +b.dataset.aStep; saveA(); renderAdvice(); });
  $("[data-a-back]", host)?.addEventListener("click", () => { A.step = Math.max(1, A.step - 1); saveA(); renderAdvice(); top(); });
  $("[data-a-next]", host)?.addEventListener("click", () => {
    if (A.step === 4 && !need(host, A.reflect.trim().length > 2, "Add a sentence or two before finishing.")) return;
    A.step++; saveA(); renderAdvice(); top();
  });
  $("[data-a-restart]", host)?.addEventListener("click", () => { A = aDefaults(); saveA(); renderAdvice(); top(); });
  $("[data-a-save]", host)?.addEventListener("click", () => { if (A.saved) { go("week-1"); return; } A.saved = true; saveA(); renderAdvice(); });
}

/* Re-render whenever either screen opens, so the newest version always shows. */
const prevGate = window.TCCGate;
window.TCCGate = name => {
  if (name === "w1-blind-spot") renderBlind();
  if (name === "case-advice") renderAdvice();
  if (name === "w1-profile") renderProfileEvidence();
  return prevGate ? prevGate(name) : true;
};
renderBlind(); renderAdvice(); renderProfileEvidence();
})();
