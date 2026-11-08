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
  ["The laugh and the glance at her phone", "A light tone over something that may feel heavier."],
  ["“It’s fine” said twice", "Repeating it can be a way of closing the topic."],
  ["The jump to her sister", "She changed direction right after saying what didn’t happen."],
  ["The quieter apology", "She apologizes to you, not just about the task."],
  ["“You probably think I’m hopeless”", "A prediction about what you think. It brings you into the moment."]
];
const pulls = [
  ["Reassure her she isn’t hopeless", "Warm, but it can quietly close the door on the fear she just named."],
  ["Fix the manager problem", "Useful later. Right now it skips what not doing it meant to her."],
  ["Move on to her sister’s visit", "It follows her lead, and leaves the moment that just mattered behind."],
  ["Explain that change takes time", "True, but it teaches instead of asks."],
  ["Freeze and search for the right words", "Very common. The pause itself is fine. What helps is knowing where to look next."]
];
const sortItems = [
  ["She didn’t raise it with her manager.", "seen", "She told you this directly."],
  ["She laughed and looked at her phone.", "seen", "You could see it happen."],
  ["She changed the subject.", "seen", "She moved to her sister without being asked."],
  ["She’s avoiding conflict.", "added", "Plausible, but she hasn’t said it. Worth checking, not assuming."],
  ["She’s embarrassed.", "added", "The laugh and the apology might fit. They might not."],
  ["She expects you to judge her.", "added", "She said “you probably think,” but what she expects is still your guess."]
];
const checks = {
  3: "“What made bringing it up feel hard?”",
  4: "“What was it like to tell me you didn’t bring it up?”",
  5: "“What do you imagine I’m thinking right now?”"
};
/* Say: three purposes, each with one example line and Maya's response to that purpose. */
const purposes = [
  { id: "name", label: "Name what just happened", why: "Gently point to something she did, so she can look at it with you.",
    example: "You laughed when you said it wasn’t a big deal. What’s it like to say that out loud?",
    maya: "(small laugh) I guess I always say it’s fine. It’s easier than admitting I chickened out.",
    next: [
      ["“What does ‘chickened out’ feel like, saying it to me now?”", "Stays with what just opened and slows things down."],
      ["“You said ‘always.’ Where else do you tell people it’s fine?”", "Follows her own word toward a pattern. Helpful if she’s ready to widen the lens."],
      ["“Let’s plan how you’ll bring it up this week.”", "Action can come later. Right now it may close what she just opened."]
    ] },
  { id: "fear", label: "Get curious about her fear", why: "Explore the prediction she made about you instead of correcting it.",
    example: "You said I probably think you’re hopeless. What made you expect that?",
    maya: "(pause) Because everyone else does. My dad used to say I never finish anything.",
    next: [
      ["“That sounds like it stuck with you. What’s it like to hear it in your head now?”", "Stays with the impact of what she shared."],
      ["“When you expect me to see you that way, what happens for you here, with me?”", "Gently brings it into the room. Powerful when the relationship can hold it."],
      ["“I don’t think you’re hopeless at all.”", "Kind, but it argues with her rather than understanding her, and may end the thread."]
    ] },
  { id: "choose", label: "Choose the focus together", why: "Name both threads and let her decide what matters most today.",
    example: "We could talk about your sister’s visit, or the conversation that didn’t happen. Which matters more today?",
    maya: "The sister thing, I guess… (pause) Actually, no. The work thing. I keep avoiding it.",
    next: [
      ["“You changed your mind just now. What shifted?”", "Notices her process in the moment. Often where the real material is."],
      ["“Let’s look at the avoiding. What happens right before you back off?”", "Follows her choice and gets specific."],
      ["“Okay, tell me about your sister’s visit.”", "Follows her first answer and misses that she corrected herself."]
    ] }
];
const ROUNDS = [["P", "Pause"], ["A", "Attend"], ["U", "Use what you know"], ["S", "Say it"], ["E", "Explore"]];

let B = load(B_KEY) || {};
const bDefaults = () => ({ v: 3, round: 1, pull: "", taps: [], revealed: false, sort: {}, check: "", purpose: "", line: "", spoken: false, next: "", done: false, saved: false });
B = B.v === 3 ? Object.assign(bDefaults(), B) : bDefaults();
const saveB = () => store(B_KEY, B);

const momentPanel = (interactive) => `<aside class="moment">
  <p class="moment-who"><span>${esc(maya.who)}</span>${esc(maya.when)}</p>
  <p class="moment-setup">${esc(maya.setup)}</p>
  <div class="moment-lines">${maya.lines.map(([id, kind, text]) => kind === "stage"
    ? `<button type="button" class="moment-stage${B.taps.includes(id) ? " tapped" : ""}" ${interactive ? `data-tap="${id}"` : "disabled"}>(${esc(text)})</button>`
    : `<button type="button" class="moment-say${B.taps.includes(id) ? " tapped" : ""}" ${interactive ? `data-tap="${id}"` : "disabled"}>“${esc(text)}”</button>`).join(" ")}</div>
  ${interactive ? `<p class="moment-hint">Tap to highlight</p>` : ""}
</aside>`;

function bRail() {
  return `<nav class="round-rail pause-rail" aria-label="P.A.U.S.E. steps">${ROUNDS.map(([l, r], i) => `<button type="button" class="${i + 1 === B.round ? "active" : ""} ${i + 1 < B.round || B.done ? "complete" : ""}" data-b-round="${i + 1}" ${i + 1 > B.round ? "disabled" : ""}><b>${l}</b><span>${r}</span></button>`).join("")}</nav>`;
}
const pick = id => purposes.find(p => p.id === id);

function blindBody() {
  const r = B.round;
  if (r === 1) { const p = pulls.find(x => x[0] === B.pull); return `${momentPanel(false)}<div class="task">
    <p class="eyebrow">P · Pause</p><h2>She just said, “You probably think I’m <em>hopeless.</em>”</h2>
    <p class="task-sub">Before you say anything: what do you feel pulled to do?</p>
    <div class="pick-list">${pulls.map(([label]) => `<button type="button" class="${B.pull === label ? "selected" : ""}" data-pull="${esc(label)}">${esc(label)}</button>`).join("")}</div>
    ${p ? `<div class="insight"><p>${esc(p[1])}</p><p class="insight-key">Noticing the pull is the pause. It’s information, not an instruction.</p></div>` : ""}
    <div class="task-actions">${B.pull ? `<button class="primary" data-b-next>Next: Attend →</button>` : ""}</div></div>`; }
  if (r === 2) return `${momentPanel(true)}<div class="task">
    <p class="eyebrow">A · Attend</p><h2>Bring your attention back to <em>Maya.</em></h2>
    <p class="task-sub">In the transcript, tap everything she actually showed you: words, pauses, actions.</p>
    ${B.revealed ? `<div class="reveal"><p class="eyebrow">What other clinicians noticed</p><ul>${noticed.map(([a, b]) => `<li><strong>${a}</strong>${b}</li>`).join("")}</ul></div>` : `<p class="tap-count">${B.taps.length ? `${B.taps.length} highlighted` : "Nothing highlighted yet"}</p>`}
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${B.revealed ? `<button class="primary" data-b-next>Next: Use what you know →</button>` : `<button class="primary" data-b-reveal>Compare with other clinicians</button>`}</div></div>`;
  if (r === 3) {
    const allSorted = sortItems.every((_, i) => B.sort[i]);
    return `${momentPanel(false)}<div class="task">
    <p class="eyebrow">U · Use what you know</p><h2>What do you actually know, and what are you <em>guessing?</em></h2>
    <p class="task-sub">Sort each statement.</p>
    <div class="sort-list">${sortItems.map(([s, ans, why], i) => { const pk = B.sort[i]; return `<div class="sort-row">
      <p>${esc(s)}</p><div class="sort-btns"><button type="button" class="${pk === "seen" ? "selected" : ""}" data-sort="${i}" data-val="seen">She said or did this</button><button type="button" class="${pk === "added" ? "selected" : ""}" data-sort="${i}" data-val="added">I’m guessing this</button></div>
      ${pk ? `<p class="sort-note ${pk === ans ? "match" : "look"}">${pk === ans ? "Yes. " : "Look again. "}${esc(why)}</p>` : ""}</div>`; }).join("")}</div>
    ${allSorted ? `<p class="task-q">Which guess would you most want to check with her?</p><div class="pick-list">${[3, 4, 5].map(i => `<button type="button" class="${B.check === String(i) ? "selected" : ""}" data-check="${i}">${esc(sortItems[i][0])}</button>`).join("")}</div>
      ${B.check ? `<div class="insight"><p class="insight-label">One way to check it</p><p class="insight-quote">${checks[B.check]}</p><p class="insight-key">A guess becomes useful once you ask about it.</p></div>` : ""}` : ""}
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${allSorted && B.check ? `<button class="primary" data-b-next>Next: Say it →</button>` : ""}</div></div>`;
  }
  if (r === 4) { const p = pick(B.purpose); return `${momentPanel(false)}<div class="task">
    <p class="eyebrow">S · Say one purposeful thing</p><h2>What do you want your next words to <em>do?</em></h2>
    <p class="task-sub">Pick a purpose first. The words come easier once you know what they’re for.</p>
    <div class="pick-list">${purposes.map(x => `<button type="button" class="${B.purpose === x.id ? "selected" : ""}" data-purpose="${x.id}">${esc(x.label)}<small class="muted">${esc(x.why)}</small></button>`).join("")}</div>
    ${p ? `<label>Now say your line out loud to Maya. Then type what you said.<textarea data-b="line" rows="3" placeholder="One natural sentence. It doesn’t need to be perfect.">${esc(B.line)}</textarea></label>
      ${B.spoken ? `<div class="insight"><p class="insight-label">One way a clinician might say it</p><p class="insight-quote">“${esc(p.example)}”</p><p class="insight-key">Yours doesn’t need to match. Check that it does the same job.</p></div>` : ""}` : ""}
    <p class="form-error" role="alert"></p>
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${p ? (B.spoken ? `<button class="primary" data-b-next>Next: See how Maya responds →</button>` : `<button class="primary" data-b-spoken>Compare with an example</button>`) : ""}</div></div>`; }
  if (r === 5) { const p = pick(B.purpose), n = p.next.find(x => x[0] === B.next); return `<aside class="moment">
      <p class="moment-who"><span>${esc(maya.who)}</span>${esc(maya.when)}</p>
      <p class="moment-setup">You said:</p><p class="moment-you">“${esc(B.line)}”</p>
      <p class="moment-setup">Maya responds:</p><div class="moment-lines"><span class="moment-say solo">${esc(p.maya).replace(/\(([^)]*)\)/g, '<i>($1)</i>')}</span></div></aside><div class="task">
    <p class="eyebrow">E · Explore what follows</p><h2>Maya opened a door. Where do you <em>go next?</em></h2>
    <div class="pick-list">${p.next.map(([label]) => `<button type="button" class="${B.next === label ? "selected" : ""}" data-nextpick="${esc(label)}">${esc(label)}</button>`).join("")}</div>
    ${n ? `<div class="insight"><p class="insight-label">What this does</p><p>${esc(n[1])}</p></div>` : ""}
    <div class="task-actions"><button class="secondary" data-b-back>← Back</button>${n ? `<button class="primary" data-b-finish>Finish the lab</button>` : ""}</div></div>`; }
  return "";
}

function renderBlind() {
  const host = $("[data-week1-blind-spot]"); if (!host) return;
  if (B.done) {
    const p = pick(B.purpose);
    host.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
      <article class="pattern-card"><p class="eyebrow">Week 1 · Clinical Blind Spot Lab</p><h1>Your P.A.U.S.E. with <em>Maya.</em></h1>
      <div class="pattern-grid">
        <div><span>P · The pull you noticed</span><p>${esc(B.pull)}</p></div>
        <div><span>U · The guess you’d check</span><p>${esc(sortItems[+B.check]?.[0] || "")}</p></div>
        <div><span>S · Your purpose and line</span><p>${esc(p.label)}<br><em>“${esc(B.line)}”</em></p></div>
        <div><span>E · Where you went next</span><p>${esc(B.next)}</p></div>
      </div>
      <div class="task-actions"><button class="secondary" data-b-restart>Practice again</button><button class="primary" data-b-save>${B.saved ? "Saved ✓ Open my profile →" : "Save to my Confidence Profile →"}</button></div></article></div>`;
    $("[data-b-restart]", host).onclick = () => { B = bDefaults(); saveB(); renderBlind(); top(); };
    $("[data-b-save]", host).onclick = () => { B.saved = true; saveB(); renderProfileEvidence(); go("w1-profile"); };
    bindGo(host); return;
  }
  host.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Train</p><h1>Clinical Blind Spot <em>Lab</em></h1><p>One client moment, walked through P.A.U.S.E. one step at a time.</p></header>
    ${bRail()}<article class="practice-stage">${blindBody()}</article></div>`;
  bindBlind(host);
}

function need(host, ok, msg) { if (!ok) { const e = $(".form-error", host); if (e) e.textContent = msg; } return ok; }
function bindGo(host) { $$("[data-go]", host).forEach(b => b.onclick = () => go(b.dataset.go)); }

function bindBlind(host) {
  bindGo(host);
  $$("[data-tap]", host).forEach(b => b.onclick = () => { const id = b.dataset.tap; B.taps = B.taps.includes(id) ? B.taps.filter(x => x !== id) : [...B.taps, id]; saveB(); b.classList.toggle("tapped"); const c = $(".tap-count", host); if (c) c.textContent = B.taps.length ? `${B.taps.length} highlighted` : "Nothing highlighted yet"; });
  $$("[data-b]", host).forEach(t => t.oninput = () => { B[t.dataset.b] = t.value; saveB(); });
  $$("[data-b-round]", host).forEach(b => b.onclick = () => { B.round = +b.dataset.bRound; saveB(); renderBlind(); });
  $$("[data-pull]", host).forEach(b => b.onclick = () => { B.pull = b.dataset.pull; saveB(); renderBlind(); });
  $$("[data-sort]", host).forEach(b => b.onclick = () => { B.sort[b.dataset.sort] = b.dataset.val; saveB(); renderBlind(); });
  $$("[data-check]", host).forEach(b => b.onclick = () => { B.check = b.dataset.check; saveB(); renderBlind(); });
  $$("[data-purpose]", host).forEach(b => b.onclick = () => { if (B.purpose !== b.dataset.purpose) { B.purpose = b.dataset.purpose; B.spoken = false; B.next = ""; } saveB(); renderBlind(); });
  $$("[data-nextpick]", host).forEach(b => b.onclick = () => { B.next = b.dataset.nextpick; saveB(); renderBlind(); });
  $("[data-b-reveal]", host)?.addEventListener("click", () => { if (!need(host, B.taps.length >= 2, "Tap at least two things Maya said or did.")) return; B.revealed = true; saveB(); renderBlind(); });
  $("[data-b-spoken]", host)?.addEventListener("click", () => { if (!need(host, B.line.trim().length > 2, "Say it out loud, then type what you said.")) return; B.spoken = true; saveB(); renderBlind(); });
  $("[data-b-back]", host)?.addEventListener("click", () => { B.round = Math.max(1, B.round - 1); saveB(); renderBlind(); top(); });
  $("[data-b-next]", host)?.addEventListener("click", () => { B.round++; saveB(); renderBlind(); top(); });
  $("[data-b-finish]", host)?.addEventListener("click", () => { B.done = true; saveB(); renderBlind(); top(); });
}

function renderProfileEvidence() {
  const panel = $('[data-screen-panel="w1-profile"] .advanced-shell'); if (!panel) return;
  let box = $("[data-profile-evidence]", panel);
  if (!B.saved) { box?.remove(); return; }
  if (!box) { box = document.createElement("aside"); box.dataset.profileEvidence = ""; box.className = "profile-evidence"; $(".advanced-head", panel).after(box); }
  box.innerHTML = `<p class="eyebrow">From your Blind Spot Lab</p><div><span>Your pull</span><p>${esc(B.pull)}</p></div><div><span>Your line</span><p>“${esc(B.line)}”</p></div>`;
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
const aDefaults = () => ({ step: 1, b1: "", line: "", seen1: false, b2: "", rw: "", reflect: "", saved: false });
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
    <p class="task-sub">Pick the purpose first. Jordan will respond to what you choose.</p>
    <div class="pick-list">${beat1.map(([id, label]) => `<button type="button" class="${A.b1 === id ? "selected" : ""}" data-b1="${id}">${esc(label)}</button>`).join("")}</div>
    ${A.b1 ? `<label>Say your line out loud to Jordan, then type it.<input type="text" data-a="line" value="${esc(A.line)}" placeholder="What you’d actually say…"></label>` : ""}
    ${A.b1 && A.seen1 ? reply("Jordan", p1[2], p1[3]) : ""}
    <p class="form-error" role="alert"></p><div class="task-actions">${A.b1 ? (A.seen1 ? `<button class="primary" data-a-next>Keep going →</button>` : `<button class="primary" data-a-seen>See how Jordan responds</button>`) : ""}</div></div>`;
  if (s === 2) return `${jordanPanel(`<div class="moment-path"><span>You chose</span>${esc(p1[1])}</div>`)}<div class="task">
    <p class="eyebrow">Beat 2 · It shifts</p><p class="task-sub">A few minutes later, Jordan says:</p><h2 class="said">“${esc(shiftLine)}”</h2>
    <p class="task-q">What’s your purpose now?</p>
    <div class="pick-list">${beat2.map(([id, label]) => `<button type="button" class="${A.b2 === id ? "selected" : ""}${A.b1 === "safety" && id === "assess" ? " suggested" : ""}" data-b2="${id}">${esc(label)}${A.b1 === "safety" && id === "assess" ? "<small>Given what Jordan just shared</small>" : ""}</button>`).join("")}</div>
    ${A.b2 === "role" ? `<p class="your-line">You: “I won’t choose for you, and I won’t leave you alone with it.”</p>` : ""}
    ${p2 ? reply("Jordan", p2[2], p2[3]) : ""}
    <p class="form-error" role="alert"></p><div class="task-actions"><button class="secondary" data-a-back>← Back</button>${A.b2 ? `<button class="primary" data-a-next>Rewind →</button>` : ""}</div></div>`;
  if (s === 3) return `${jordanPanel()}<div class="task">
    <p class="eyebrow">Beat 3 · Rewind</p><h2>Go back. Try a different <em>purpose.</em></h2>
    <p class="task-sub">Same question from Jordan. Pick a purpose you didn’t choose the first time.</p>
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
  $$("[data-b1]", host).forEach(b => b.onclick = () => { if (A.b1 !== b.dataset.b1) { A.b1 = b.dataset.b1; A.seen1 = false; A.b2 = ""; } if (A.rw === A.b1) A.rw = ""; saveA(); renderAdvice(); });
  $("[data-a-seen]", host)?.addEventListener("click", () => { if (!need(host, A.line.trim().length > 2, "Say it out loud, then type what you said.")) return; A.seen1 = true; saveA(); renderAdvice(); });
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
