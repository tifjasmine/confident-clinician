/* Week 2 signature lab: Clinical Detective (rebuilt Nov 8).
   A case board on the left that fills as you work; one step at a time on the right.
   Open the files → pin the clues → form a hunch → the twist breaks it → choose a move and see Avery respond.
   Avery's lines come from the original lab; new reactions and "how I'd think about it" are DRAFT wording for Tiffany's review. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "tcc-w2-detective-v2";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch {} };

const OPENING = "Work is a mess. I’m barely sleeping. My sister’s upset with me, and I keep canceling on my friends. I feel like I’m failing at everything, and I don’t even know where to start.";
const FILES = [
  { id: "work", name: "Work", cue: "speeds up", quote: "I keep missing deadlines. My manager keeps adding new responsibilities, and I hate disappointing them." },
  { id: "sleep", name: "Sleep", cue: "quieter", quote: "I replay conversations at night and wonder if people think I let them down." },
  { id: "family", name: "Family", cue: "small laugh", quote: "My sister says I take on too much. But I’m the one everyone calls when they need help." },
  { id: "friends", name: "Friends", cue: "looks down", quote: "I’ve been declining invitations. I’m exhausted, and I feel guilty about that too." }
];
const CLUES = [
  ["I hate disappointing them", "work"], ["My manager keeps adding responsibilities", "work"], ["Missing deadlines", "work"],
  ["Replays conversations at night", "sleep"], ["Wonders if people think they let them down", "sleep"],
  ["The one everyone calls", "family"], ["Sister says they take on too much", "family"],
  ["Exhausted", "friends"], ["Feels guilty for saying no", "friends"]
];
const OTHERS = ["I hate disappointing them", "Wonders if people think they let them down", "The one everyone calls", "Feels guilty for saying no"];
const HUNCHES = [
  ["Avery may fear disappointing people, so they keep saying yes and run out of room.", "A relational pattern. Worth checking, not assuming."],
  ["Avery may simply have more responsibility than one person can carry right now.", "A practical explanation. It keeps real constraints in view."],
  ["There may not be one thread. These could be four separate problems.", "Holding off on a pattern is a reasonable choice this early."]
];
const QUESTIONS = [
  ["“What happens inside you when you think about saying no to someone?”", "Tests the fear-of-disappointing hunch directly."],
  ["“What are you carrying right now that other people might not see?”", "Opens the door to practical pressure you haven’t heard yet."],
  ["“Of everything you named, what feels most important for today?”", "Lets Avery lead, and tells you where the weight is."]
];
const TWIST = "I can’t just stop working extra hours. My mom needs financial help, and I’m paying for most of it. I’m scared of what happens if I say no.";
const REVISIONS = [
  ["Keep my theory, but hold it more lightly", "Fair, if you stay open. The risk is fitting new facts into an old story."],
  ["Widen it: the pattern is real, and so are the money and family stakes", "This holds both. Saying no has real costs for Avery, not just imagined ones."],
  ["Pause the theory and ask what Avery needs from today", "A good reset when the picture just changed. Theory can wait a few minutes."]
];
const MOVES = [
  ["Ask what matters most today", "“With everything you’re carrying, what would feel most useful for us to focus on today?”", "Honestly? The money thing. If I don’t figure that out, nothing else matters.", "Avery chose the focus, and it’s the newest, heaviest piece."],
  ["Gently explore the pattern", "“I notice disappointing someone keeps coming up. Could we slow down and look at what happens when someone needs something from you?”", "(pauses) Yeah… I think I’d rather be exhausted than have someone upset with me.", "Tentative wording let Avery confirm the pattern in their own words."],
  ["Map what Avery is carrying", "“Before we talk about changing anything, can we map out everything you’re carrying, and what actually has room to move?”", "Work, Mom’s rent, my sister’s kids on weekends… I’ve never actually said it all out loud.", "Naming the load made it real and visible, without blaming Avery for it."],
  ["Offer to sort it together", "“Would it help to sort this into what’s urgent, what might be connected, and what we still need to understand?”", "That would help. Right now it’s all one big knot.", "Structure lowered the overwhelm, and Avery asked for it."]
];
const TAKE = "I’d hold two things at once: a possible pattern of avoiding other people’s disappointment, and real financial pressure that makes saying no costly. Before choosing between them, I’d ask Avery what matters most today. The twist doesn’t erase the pattern. It shows the pattern has real stakes.";
const STEPS = ["Open the files", "Pin the clues", "Your hunch", "The twist", "Your move"];

const blank = () => ({ step: 1, opened: [], active: "", pins: [], showOthers: false, hunch: null, q: null, twistOpen: false, rev: null, move: null, done: false });
let D = Object.assign(blank(), load() || {});

function board() {
  const h = D.hunch != null ? HUNCHES[D.hunch][0] : "", cracked = D.twistOpen && D.rev == null, revised = D.rev != null;
  return `<aside class="case-board">
    <p class="moment-who"><span>Avery, 31</span>Third session · anxiety and stress</p>
    <p class="case-open">“${esc(OPENING)}”</p>
    <p class="board-label">Case files</p>
    <div class="board-files">${FILES.map(f => `<button type="button" class="${D.opened.includes(f.id) ? "opened" : ""} ${D.active === f.id ? "active" : ""}" ${D.step === 1 ? `data-file="${f.id}"` : "disabled"}><span>${f.name}</span><i>${D.opened.includes(f.id) ? "✓" : "+"}</i></button>`).join("")}
      ${D.step >= 4 ? `<button type="button" class="twist-file ${D.twistOpen ? "opened" : "pulse"}" ${D.step === 4 ? "data-twist" : "disabled"}><span>New file</span><i>${D.twistOpen ? "✓" : "!"}</i></button>` : ""}</div>
    ${D.pins.length ? `<p class="board-label">Pinned clues</p><div class="board-pins">${D.pins.map(p => `<span>${esc(p)}</span>`).join("")}</div>` : ""}
    ${h ? `<p class="board-label">Working theory</p><div class="case-theory ${cracked ? "cracked" : ""} ${revised ? "revised" : ""}"><p>${esc(h)}</p>${cracked ? `<b>Needs another look</b>` : ""}${revised ? `<b>Revised: ${esc(REVISIONS[D.rev][0])}</b>` : ""}</div>` : ""}
  </aside>`;
}

function stepBody() {
  const s = D.step;
  if (s === 1) { const f = FILES.find(x => x.id === D.active); const all = D.opened.length === FILES.length; return `<p class="eyebrow">Step 1 · Open the files</p><h2>Avery brought four problems. Open each <em>file.</em></h2>
    <p class="task-sub">Start wherever your curiosity goes. There’s no right order.</p>
    ${f ? `<div class="client-reply"><span class="reply-who">Avery · about ${f.name.toLowerCase()} <i>(${f.cue})</i></span><blockquote>“${esc(f.quote)}”</blockquote></div>` : `<p class="tap-count">Choose a file on the case board.</p>`}
    <div class="task-actions">${all ? `<button class="primary" data-next>Next: pin the clues →</button>` : `<span class="tap-count">${D.opened.length} of 4 opened</span>`}</div>`; }
  if (s === 2) return `<p class="eyebrow">Step 2 · Pin the clues</p><h2>Which details feel most <em>important?</em></h2>
    <p class="task-sub">Pin up to four. They’ll appear on your case board.</p>
    <div class="clue-grid">${CLUES.map(([c, f]) => `<button type="button" class="${D.pins.includes(c) ? "selected" : ""}" data-clue="${esc(c)}"><small>${FILES.find(x => x.id === f).name}</small>${esc(c)}</button>`).join("")}</div>
    ${D.showOthers ? `<div class="insight"><p class="insight-label">What other clinicians often pin</p><p>${OTHERS.map(esc).join(" · ")}</p><p class="insight-key">Notice how many of these are about other people’s reactions, not the tasks themselves.</p></div>` : ""}
    <div class="task-actions"><button class="ghost" data-back>← Back</button>${D.pins.length ? (D.showOthers ? `<button class="primary" data-next>Next: your hunch →</button>` : `<button class="primary" data-others>Compare with other clinicians</button>`) : ""}</div>`;
  if (s === 3) return `<p class="eyebrow">Step 3 · Your hunch</p><h2>What might <em>connect</em> it all?</h2>
    <p class="task-sub">Choose a working theory you’d be willing to change.</p>
    <div class="pick-list">${HUNCHES.map(([t], i) => `<button type="button" class="${D.hunch === i ? "selected" : ""}" data-hunch="${i}">${esc(t)}</button>`).join("")}</div>
    ${D.hunch != null ? `<p class="pull-note">${esc(HUNCHES[D.hunch][1])}</p><p class="task-q">Which question would test it with Avery?</p>
      <div class="pick-list">${QUESTIONS.map(([t], i) => `<button type="button" class="${D.q === i ? "selected" : ""}" data-q="${i}">${esc(t)}</button>`).join("")}</div>
      ${D.q != null ? `<p class="pull-note">${esc(QUESTIONS[D.q][1])}</p>` : ""}` : ""}
    <div class="task-actions"><button class="ghost" data-back>← Back</button>${D.hunch != null && D.q != null ? `<button class="primary" data-next>Ask Avery →</button>` : ""}</div>`;
  if (s === 4) return `<p class="eyebrow">Step 4 · The twist</p><h2>Avery adds <em>something.</em></h2>
    ${D.twistOpen ? `<div class="client-reply"><span class="reply-who">Avery</span><blockquote>“${esc(TWIST)}”</blockquote></div>
      <p class="task-q">Your theory just met new information. What do you do with it?</p>
      <div class="pick-list">${REVISIONS.map(([t], i) => `<button type="button" class="${D.rev === i ? "selected" : ""}" data-rev="${i}">${esc(t)}</button>`).join("")}</div>
      ${D.rev != null ? `<p class="pull-note">${esc(REVISIONS[D.rev][1])}</p>` : ""}`
      : `<p class="task-sub">A new file just appeared on your case board.</p><button type="button" class="twist-open" data-twist>Open the new file →</button>`}
    <div class="task-actions"><button class="ghost" data-back>← Back</button>${D.rev != null ? `<button class="primary" data-next>Next: your move →</button>` : ""}</div>`;
  if (s === 5) { const m = D.move != null ? MOVES[D.move] : null; return `<p class="eyebrow">Step 5 · Your move</p><h2>What would you <em>do</em> next?</h2>
    <div class="pick-list">${MOVES.map(([t], i) => `<button type="button" class="${D.move === i ? "selected" : ""}" data-move="${i}">${esc(t)}</button>`).join("")}</div>
    ${m ? `<p class="your-line">You: ${esc(m[1])}</p><div class="client-reply"><span class="reply-who">Avery</span><blockquote>${esc(m[2]).replace(/^\(([^)]*)\)/, "<i>($1)</i>")}</blockquote><p class="reply-shows"><b>What happened:</b> ${esc(m[3])}</p></div>` : ""}
    <div class="task-actions"><button class="ghost" data-back>← Back</button>${m ? `<button class="primary" data-finish>See your thinking map →</button>` : ""}</div>`; }
  return "";
}

function summary() {
  return `<div class="task wide"><p class="eyebrow">Clinical Detective · Case closed</p><h2>Your thinking <em>map.</em></h2>
    <ol class="think-map">
      <li><span>What you pinned</span><p>${D.pins.map(esc).join(" · ")}</p></li>
      <li><span>Your first theory</span><p>${esc(HUNCHES[D.hunch][0])}</p></li>
      <li><span>After the twist</span><p>${esc(REVISIONS[D.rev][0])}</p></li>
      <li><span>Your move</span><p>${esc(MOVES[D.move][1])}</p></li>
    </ol>
    <div class="breakdown"><p class="eyebrow">How I’d think about it</p><p>${esc(TAKE)}</p></div>
    <div class="task-actions"><button class="ghost" data-restart>Work the case again</button><button class="primary" data-go="week-2">Back to Week 2 →</button></div></div>`;
}

function render() {
  const host = $('[data-advanced-host="w2-detective"]'); if (!host) return;
  host.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-2">← Back to Week 2</button>
    <header class="practice-head"><p class="eyebrow">Week 2 · Signature lab</p><h1>Clinical <em>Detective</em></h1><p>One client, four problems. Find what might connect them, then revise when the case changes.</p></header>
    ${D.done ? "" : `<nav class="round-rail" aria-label="Detective steps">${STEPS.map((t, i) => `<button type="button" class="${i + 1 === D.step ? "active" : ""} ${i + 1 < D.step ? "complete" : ""}" ${i + 1 < D.step ? `data-step="${i + 1}"` : "disabled"}><b>${i + 1}</b><span>${t}</span></button>`).join("")}</nav>`}
    <article class="practice-stage${D.done ? " single" : ""}">${D.done ? summary() : `${board()}<div class="task">${stepBody()}</div>`}</article></div>`;
  bind(host);
}

function bind(host) {
  const top = () => host.scrollIntoView({ behavior: "smooth", block: "start" }), rr = () => { save(); render(); };
  $$("[data-go]", host).forEach(b => b.onclick = () => window.TCCShowCourseScreen?.(b.dataset.go));
  $$("[data-file]", host).forEach(b => b.onclick = () => { D.active = b.dataset.file; if (!D.opened.includes(D.active)) D.opened.push(D.active); rr(); });
  $$("[data-clue]", host).forEach(b => b.onclick = () => { const c = b.dataset.clue; if (D.pins.includes(c)) D.pins = D.pins.filter(x => x !== c); else if (D.pins.length < 4) D.pins.push(c); rr(); });
  $("[data-others]", host)?.addEventListener("click", () => { D.showOthers = true; rr(); });
  $$("[data-hunch]", host).forEach(b => b.onclick = () => { D.hunch = +b.dataset.hunch; rr(); });
  $$("[data-q]", host).forEach(b => b.onclick = () => { D.q = +b.dataset.q; rr(); });
  $$("[data-twist]", host).forEach(b => b.onclick = () => { D.twistOpen = true; rr(); });
  $$("[data-rev]", host).forEach(b => b.onclick = () => { D.rev = +b.dataset.rev; rr(); });
  $$("[data-move]", host).forEach(b => b.onclick = () => { D.move = +b.dataset.move; rr(); });
  $$("[data-step]", host).forEach(b => b.onclick = () => { D.step = +b.dataset.step; rr(); });
  $("[data-next]", host)?.addEventListener("click", () => { D.step++; rr(); top(); });
  $("[data-back]", host)?.addEventListener("click", () => { D.step = Math.max(1, D.step - 1); rr(); top(); });
  $("[data-finish]", host)?.addEventListener("click", () => { D.done = true; rr(); top(); });
  $("[data-restart]", host)?.addEventListener("click", () => { D = blank(); rr(); });
}

const prevGate = window.TCCGate;
window.TCCGate = name => { const ok = prevGate ? prevGate(name) : true; if (ok && name === "w2-detective") render(); return ok; };
render();
})();
