/* Week 1 Reps (prototype, Nov 7). One loop for every rep:
   read the moment → write your response → see two example responses → check yourself on the week's skill → go again.
   All client moments and example responses are fictional DRAFT wording for Tiffany's clinical review. No scores. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "tcc-w1-reps-v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const SKILL = "Notice before you respond";
const CHECKS = [
  "I paused before fixing, reassuring or explaining.",
  "My response connected to something the client actually said or did.",
  "It left room for the client to say more."
];
const LEVELS = ["Warm-up", "Steady", "Stretch"];
const REPS = [
  { id: "normal", level: 0, who: "Sam, 26", when: "Second session",
    setup: "Sam has been describing panic at work.",
    line: "Am I crazy for feeling this way? Just tell me if this is normal.",
    examples: [
      ["“It sounds like you’ve been worried something is wrong with you. What makes you wonder that?”", "Gets curious about the worry underneath the question."],
      ["“A lot of people feel this way. I’m also curious what it’s like for you to feel it.”", "Offers some normalizing without closing the door."]
    ] },
  { id: "silence", level: 0, who: "Priya, 41", when: "Third session",
    setup: "You ask how she’s been sleeping. She looks at the floor.",
    line: "(silence for about ten seconds)",
    examples: [
      ["“Take your time.”", "Stays with her and lets the silence do some work."],
      ["“I noticed you looked down when I asked. What came up just now?”", "Gently names what you saw instead of filling the gap."]
    ] },
  { id: "hopeless", level: 1, who: "Maya, 34", when: "Fourth session",
    setup: "You ask how the talk with her manager went. She laughs, glances at her phone.",
    line: "Oh, fine. I didn’t really bring it up. It’s not a big deal. … Sorry. You probably think I’m hopeless.",
    examples: [
      ["“You said I probably think you’re hopeless. What made you expect that?”", "Explores the prediction she made about you instead of correcting it."],
      ["“You laughed when you said it wasn’t a big deal. What’s it like to say that out loud?”", "Gently points to something she did, so she can look at it with you."]
    ] },
  { id: "compliment", level: 1, who: "Alex, 35", when: "Sixth session",
    setup: "Near the end of a session that felt good.",
    line: "Honestly, you get me way more than any therapist I’ve had.",
    examples: [
      ["“I’m glad it feels that way. What feels different here?”", "Receives it warmly, then gets curious."],
      ["“What did you need from them that you didn’t get?”", "Turns the compliment into useful information."]
    ] },
  { id: "pointless", level: 2, who: "Chris, 47", when: "Eighth session",
    setup: "Voice raised, arms crossed.",
    line: "This is pointless. We talk and talk and nothing changes.",
    examples: [
      ["“You’re frustrated, and it sounds like it’s been building. What did you hope would be different by now?”", "Stays steady and invites the specifics."],
      ["“I’m glad you said it. What would ‘something changing’ look like to you?”", "Welcomes the challenge instead of defending the work."]
    ] },
  { id: "mademe", level: 2, who: "Devon, 52", when: "First session",
    setup: "Arms folded, short answers so far.",
    line: "My wife made me come. I don’t really see the point, but go ahead, ask your questions.",
    examples: [
      ["“Sounds like this wasn’t your idea. What do you make of her wanting you here?”", "Names the reluctance and gets curious about it."],
      ["“Fair enough. Since you’re here, is there anything you’d want from this, even something small?”", "Respects his stance and invites his own reason to be here."]
    ] }
];

const blank = () => ({ i: 0, step: "say", reps: {} });
   // reps[id] = { done, checks:[yes/no x3], tries }
let S = Object.assign(blank(), load() || {});
const cur = () => REPS[S.i];
const rec = id => S.reps[id] || (S.reps[id] = { done: false, checks: [null, null, null], tries: 0 });

function railHTML() {
  return `<ol class="reps-rail">${REPS.map((r, i) => { const d = S.reps[r.id]?.done;
    return `<li><button type="button" class="${i === S.i ? "active" : ""} ${d ? "done" : ""}" data-rep="${i}"><span>${d ? "✓" : i + 1}</span>${esc(r.who.split(",")[0])}</button></li>`; }).join("")}</ol>`;
}

function repHTML() {
  const r = cur(), R = rec(r.id), last = S.i === REPS.length - 1;
  const client = `<div class="rep-client"><p class="rep-meta"><span>${esc(r.who)}</span>${esc(r.when)}</p><p class="rep-setup">${esc(r.setup)}</p><blockquote class="rep-line">${r.line.startsWith("(") ? `<i>${esc(r.line)}</i>` : `“${esc(r.line)}”`}</blockquote></div>`;
  const steps = ["Say it", "Compare", "Check"], idx = { say: 0, compare: 1, check: 2 }[S.step];
  const stepBar = `<ol class="rep-steps">${steps.map((t, i) => `<li class="${i === idx ? "on" : i < idx ? "past" : ""}">${t}</li>`).join("")}</ol>`;
  let body = "";
  if (S.step === "say") body = `<h2>What would you say to ${esc(r.who.split(",")[0])}?</h2>
      <textarea class="rep-input" data-resp rows="3" placeholder="Write it the way you’d actually say it.">${esc(R.text || "")}</textarea>
      <p class="form-error" role="alert"></p>
      <div class="rep-actions"><button class="primary" data-said>Compare →</button></div>`;
  if (S.step === "compare") body = `<div class="rep-yours"><span>You said</span><p>“${esc(R.text)}”</p></div><h2>Two ways a clinician might respond</h2>
      <div class="rep-examples">${r.examples.map(([t, w]) => `<div><blockquote>${esc(t)}</blockquote><p>${esc(w)}</p></div>`).join("")}</div>
      <p class="rep-note">Yours doesn’t need to match. There’s more than one good response.</p>
      <div class="rep-actions"><button class="primary" data-tocheck>Check my response →</button></div>`;
  if (S.step === "check") { const all = R.checks.every(v => v !== null); body = `<div class="rep-yours"><span>You said</span><p>“${esc(R.text)}”</p></div><h2>Check your response</h2>
      <div class="rep-checks">${CHECKS.map((c, k) => `<div class="rep-check"><p>${c}</p><div><button type="button" class="${R.checks[k] === true ? "sel" : ""}" data-chk="${k}" data-v="1">Yes</button><button type="button" class="${R.checks[k] === false ? "sel" : ""}" data-chk="${k}" data-v="0">Not yet</button></div></div>`).join("")}</div>
      <div class="rep-actions"><button class="ghost" data-again>Try this one again</button>${all ? (last ? `<button class="primary" data-finish>Finish this week’s reps →</button>` : `<button class="primary" data-next>Next rep →</button>`) : ""}</div>`; }
  return `${client}<div class="rep-work">${stepBar}${body}</div>`;
}

function summaryHTML() {
  const miss = CHECKS.map((c, k) => [c, REPS.filter(r => S.reps[r.id]?.checks[k] === false).length]).sort((a, b) => b[1] - a[1]);
  const edge = miss[0][1] ? miss[0][0] : "";
  return `<div class="rep-summary"><p class="eyebrow">Week 1 reps · done</p><h2>${REPS.length} moments <em>practiced.</em></h2>
    ${edge ? `<div class="rep-edge"><span>Your growth edge this week</span><p>${esc(edge)}</p><small>Marked “not yet” ${miss[0][1]} of ${REPS.length} times. That’s what to practice next.</small></div>` : `<div class="rep-edge"><span>This week</span><p>You checked “yes” on every skill. Try the Stretch reps again, faster.</p></div>`}
    <div class="rep-actions"><button class="ghost" data-restart>Run the reps again</button><button class="primary" data-go-profile>Add to my Confidence Profile →</button></div></div>`;
}

function render() {
  const host = $("[data-week1-blind-spot]"); if (!host) return;
  const finished = S.finished;
  host.innerHTML = `<div class="advanced-shell reps-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Reps</p><h1>${SKILL.replace(/respond$/, "<em>respond.</em>")}</h1><p>Six short client moments. They get harder as you go.</p></header>
    <div class="reps-layout">${railHTML()}<article class="rep-card">${finished ? summaryHTML() : repHTML()}</article></div></div>`;
  bind(host);
}

function bind(host) {
  $$("[data-go]", host).forEach(b => b.onclick = () => window.TCCShowCourseScreen?.(b.dataset.go));
  const r = cur(), R = rec(r.id), top = () => host.scrollIntoView({ behavior: "smooth", block: "start" });
  $$("[data-rep]", host).forEach(b => b.onclick = () => { S.i = +b.dataset.rep; S.step = "say"; S.finished = false; save(); render(); });
  $("[data-resp]", host)?.addEventListener("input", e => { R.text = e.target.value; save(); });
  $("[data-said]", host)?.addEventListener("click", () => { if ((R.text || "").trim().length < 3) { $(".form-error", host).textContent = "Write your response first."; return; } R.tries++; S.step = "compare"; save(); render(); });
  $("[data-tocheck]", host)?.addEventListener("click", () => { S.step = "check"; save(); render(); });
  $$("[data-chk]", host).forEach(b => b.onclick = () => { R.checks[+b.dataset.chk] = b.dataset.v === "1"; save(); render(); });
  $("[data-again]", host)?.addEventListener("click", () => { R.checks = [null, null, null]; S.step = "say"; save(); render(); });
  $("[data-next]", host)?.addEventListener("click", () => { R.done = true; S.i++; S.step = "say"; save(); render(); top(); });
  $("[data-finish]", host)?.addEventListener("click", () => { R.done = true; S.finished = true; save(); render(); top(); });
  $("[data-restart]", host)?.addEventListener("click", () => { S = blank(); save(); render(); });
  $("[data-go-profile]", host)?.addEventListener("click", () => window.TCCShowCourseScreen?.("w1-profile"));
}

window.TCCRenderReps = render;
window.TCCRepsSummary = () => { const done = REPS.filter(r => S.reps[r.id]?.done).length;
  const miss = CHECKS.map((c, k) => [c, REPS.filter(r => S.reps[r.id]?.checks[k] === false).length]).sort((a, b) => b[1] - a[1]);
  return { done, total: REPS.length, edge: miss[0][1] ? miss[0][0] : "" }; };
render();
})();
