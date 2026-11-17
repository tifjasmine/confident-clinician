/* Week 1 simulation: "Pressure Points" (replaces The Advice Request as practice, Nov 8).
   One fictional first session with Rosa, three pressure points (minute 5, 25, 45).
   Each turn: name the pull you feel → choose a response → Rosa reacts → what it did and when it fits → the skill here.
   Ends with the session read back as a transcript, plus a rewind. All wording is DRAFT for Tiffany's clinical review. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stage = t => esc(t).replace(/\(([^)]*)\)/g, "<i>($1)</i>");
const KEY = "tcc-w1-session-v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const CLIENT = { who: "Rosa, 45", when: "First session", about: "Came in for stress since her divorce. Her last therapy “didn’t work out.”" };
const TURNS = [
  { min: 5, label: "Opening", setup: "You’ve just finished the paperwork.",
    line: "Before we start, how long have you been doing this? You look pretty young.",
    pulls: ["Prove I’m qualified", "Brush it off with a joke", "Feel a little defensive", "Not much, honestly"],
    pick: 3, why: "It answers honestly and briefly, then gets curious about why it matters. You keep your credibility without performing it.",
    take: "When a client tests you, answer simply, then get curious about what they need.",
    options: [
      ["“I’ve been licensed three years, and I’ve worked with a lot of people going through divorce.”", "defend", "closes", "(nods, sits back) Okay.", "You answered the question, but not the worry behind it. She stays guarded.", "A brief honest answer is fair. Pair it with curiosity so it doesn’t end there."],
      ["“That’s a fair question. What would help you feel this could be a good fit?”", "stay", "opens", "Honestly? My last therapist just nodded a lot. I need someone who’ll actually say something.", "You learned what she needs from you, and what went wrong before.", "Works well when you sense the question is really about trust."],
      ["“Age doesn’t really matter in therapy. What matters is the relationship.”", "defend", "closes", "(small laugh) That’s what someone young would say.", "Arguing the point invited her to push back.", "Rarely helpful early on. It can sound like a defense."],
      ["“Three years. It sounds like it matters to you who you’re working with. What’s important to you?”", "stay", "opens", "I wasted a year last time. I can’t do that again.", "Answering plainly, then getting curious, respected both the question and the stakes.", "Fits most moments when a client asks about your experience."]
    ] },
  { min: 25, label: "Middle", setup: "You ask what the hardest part of the divorce has been. She looks out the window.",
    line: "(silence for about fifteen seconds)",
    pulls: ["Fill the silence", "Rescue her from the hard question", "Move to something easier", "Wait it out"],
    pick: 1, why: "She seemed to be thinking, not stuck. Holding steady gave her room to choose what to say.",
    take: "A long silence after a hard question is often the client deciding. Stay with them.",
    options: [
      ["“We don’t have to go there if it’s too much.”", "move", "closes", "(relieved) Yeah. Let’s talk about work instead.", "Kind, but it made the choice for her.", "Right if she looks flooded or confused. Offer to come back to it later."],
      ["(Wait quietly. Keep your attention on her.)", "stay", "opens", "(quietly) Telling my daughter. She asked if it was her fault.", "The space let her decide to say the hardest thing.", "Fits when the silence looks like thinking, not distress."],
      ["“Divorce is one of the most stressful life events there is.”", "defend", "closes", "(nods) Yeah, I’ve read that.", "Information filled the space she was using.", "Useful later, if she wants context for what she’s feeling."],
      ["“Take your time. I’m here.”", "stay", "opens", "(after a while) It’s my daughter. I don’t know what to tell her.", "A short cue made the silence feel allowed.", "A good choice if she seems anxious about the pause."]
    ] },
  { min: 45, label: "Near the end", setup: "Talking about her daughter, Rosa’s eyes fill. She wipes them quickly.",
    line: "Sorry. This is stupid. I’m fine. We can move on.",
    pulls: ["Reassure her", "Respect her wish and move on", "Feel uncomfortable with the tears", "Stay with it"],
    pick: 2, why: "It takes the apology off her shoulders and stays with what matters, without pushing her to keep crying.",
    take: "When a client apologizes for feeling, it’s an invitation to show that feelings are welcome here.",
    options: [
      ["“It’s not stupid at all. You’re doing great.”", "reassure", "closes", "(laughs, embarrassed) Okay. Thanks.", "Warm, but she still feels she has to be fine.", "A brief affirmation can land later, once she trusts you."],
      ["“Sure, let’s move on.”", "move", "closes", "(composes herself) So, work…", "Agreeing with “I’m fine” can teach her tears aren’t welcome here.", "Sometimes right near the end of a session. Name that you’ll come back to it."],
      ["“You don’t need to apologize. Something about your daughter really matters here.”", "stay", "opens", "(nods) I just don’t want her to hate me.", "She went straight to the heart of it.", "Fits most moments when a client apologizes for emotion."],
      ["“What just happened for you there?”", "stay", "opens", "I don’t cry in front of people. I didn’t expect that.", "Curiosity about the moment itself showed you something about her.", "Good when the relationship can hold a direct question."]
    ] }
];
const DOES = { reassure: "Reassures", fix: "Jumps to a fix", move: "Moves on", defend: "Explains or defends", stay: "Stays curious" };

const blank = () => ({ t: 0, turns: [{}, {}, {}], done: false });   // turns[i] = { pull, first, sel, own }
let S = Object.assign(blank(), load() || {});

function sidePanel() {
  return `<aside class="moment session-side"><p class="moment-who"><span>${CLIENT.who}</span>${CLIENT.when}</p><p class="moment-setup">${esc(CLIENT.about)}</p>
    <p class="board-label">This session</p><ol class="session-line">${TURNS.map((t, i) => { const T = S.turns[i], d = T.first != null;
      return `<li class="${i === S.t && !S.done ? "now" : ""} ${d ? "done" : ""}"><button type="button" ${d || i <= S.t ? `data-turn="${i}"` : "disabled"}><b>${t.min} min</b><span>${t.label}</span>${d ? `<i>✓</i>` : ""}</button></li>`; }).join("")}</ol></aside>`;
}

function turnHTML() {
  const i = S.t, t = TURNS[i], T = S.turns[i], ex = T.first != null, last = i === TURNS.length - 1;
  return `${sidePanel()}<div class="task">
    <p class="eyebrow">${t.min} minutes in · ${t.label}</p><p class="task-sub">${esc(t.setup)}</p>
    <blockquote class="session-line-quote">${t.line.startsWith("(") ? `<i>${esc(t.line)}</i>` : `“${esc(t.line)}”`}</blockquote>
    <p class="task-q">1 · What do you feel pulled to do?</p>
    <div class="pick-list inline">${t.pulls.map(p => `<button type="button" class="${T.pull === p ? "selected" : ""}" data-pull="${esc(p)}">${esc(p)}</button>`).join("")}</div>
    ${T.pull ? `<p class="task-q">2 · ${ex ? "Here’s what each response does. Open any to see how Rosa reacts." : "What would you most likely say?"}</p>
    <div class="rep-options${ex ? " explained" : ""}">${t.options.map((o, k) => { const open = k === T.sel; return `<div class="opt${open ? " open" : ""}">
      <button type="button" class="opt-head" data-opt="${k}" aria-expanded="${open}">${ex ? `<i class="dot ${o[2]}" aria-hidden="true"></i>` : ""}<span class="opt-say">${stage(o[0])}</span>
        ${ex ? `<span class="opt-meta">${DOES[o[1]]} · ${o[2] === "opens" ? "opens it up" : "closes it down"}${T.first === k ? " · <b>your first choice</b>" : ""}${k === t.pick ? ` · <b class="pick">what I’d most likely say</b>` : ""}</span><span class="chev" aria-hidden="true"></span>` : ""}</button>
      ${open ? `<div class="opt-body"><p class="reply-who">Rosa responds</p><blockquote>${stage(o[3])}</blockquote><p class="rep-happened"><b>What happened:</b> ${esc(o[4])}</p><p class="rep-happened"><b>Can fit when:</b> ${esc(o[5])}</p></div>` : ""}</div>`; }).join("")}</div>` : ""}
    ${ex ? `<div class="rep-why"><span>Why I’d most likely say that</span><p>${esc(t.why)}</p></div><div class="rep-take"><span>The skill here</span><p>${esc(t.take)}</p></div>
      <label class="rep-own">In your own words <small>Optional</small><textarea data-own rows="2" placeholder="How would you say it to Rosa?">${esc(T.own || "")}</textarea></label>` : ""}
    <div class="rep-actions">${i > 0 ? `<button class="ghost" data-prev>← Back</button>` : ""}${ex ? `<button class="primary" data-next>${last ? "Read back the session →" : `Go to minute ${TURNS[i + 1].min} →`}</button>` : ""}</div></div>`;
}

function recapHTML() {
  const opened = TURNS.filter((t, i) => { const f = S.turns[i].first; return f != null && t.options[f][2] === "opens"; }).length;
  return `<div class="task wide"><p class="eyebrow">Pressure Points · your session</p><h2>Your session with Rosa, read <em>back.</em></h2>
    <div class="transcript">${TURNS.map((t, i) => { const T = S.turns[i], o = t.options[T.first]; return `<div class="tr-turn"><p class="tr-min">${t.min} min · ${t.label}</p>
      <p class="tr-line"><span class="who">Rosa</span><span>${t.line.startsWith("(") ? `<i>${esc(t.line)}</i>` : `“${esc(t.line)}”`}</span></p>
      <p class="tr-pull">Your pull: ${esc(T.pull)}</p>
      <p class="tr-line you"><span class="who">You</span><span>${stage(T.own && T.own.trim() ? `“${T.own.trim()}”` : o[0])}</span></p>
      <p class="tr-line"><span class="who">Rosa</span><span>${stage(o[3])}</span></p>
      <button type="button" class="linkish" data-turn="${i}">Rewind to minute ${t.min}</button></div>`; }).join("")}</div>
    <div class="rep-score"><b>${opened} of ${TURNS.length}</b><p>Your first choice kept the session open at ${opened} of ${TURNS.length} pressure points. The pulls you named are the ones to watch for in real sessions this week.</p></div>
    <div class="rep-actions"><button class="ghost" data-restart>Run the session again</button><button class="primary" data-go="w1-profile">Add to my Confidence Profile →</button></div></div>`;
}

function render() {
  const panel = $('[data-screen-panel="case-advice"]'); if (!panel) return;
  panel.innerHTML = `<div class="advanced-shell practice-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Simulation</p><h1>Pressure <em>Points</em></h1><p>One first session, three moments that pull on you. Notice the pull, then choose how to respond.</p></header>
    <article class="practice-stage${S.done ? " single" : ""}">${S.done ? recapHTML() : turnHTML()}</article></div>`;
  bind(panel);
}

function bind(host) {
  const T = S.turns[S.t], rr = () => { save(); render(); }, top = () => host.scrollIntoView({ behavior: "smooth", block: "start" });
  $$("[data-go]", host).forEach(b => b.onclick = () => window.TCCShowCourseScreen?.(b.dataset.go));
  $$("[data-turn]", host).forEach(b => b.onclick = () => { S.t = +b.dataset.turn; S.done = false; rr(); top(); });
  $$("[data-pull]", host).forEach(b => b.onclick = () => { T.pull = b.dataset.pull; rr(); });
  $$("[data-opt]", host).forEach(b => b.onclick = () => { const k = +b.dataset.opt; if (T.first == null) T.first = k; T.sel = T.sel === k && T.first !== k ? null : k; rr(); });
  $("[data-own]", host)?.addEventListener("input", e => { T.own = e.target.value; save(); });
  $("[data-prev]", host)?.addEventListener("click", () => { S.t = Math.max(0, S.t - 1); rr(); top(); });
  $("[data-next]", host)?.addEventListener("click", () => { if (S.t < TURNS.length - 1) S.t++; else S.done = true; rr(); top(); });
  $("[data-restart]", host)?.addEventListener("click", () => { S = blank(); rr(); });
}

window.TCCSessionSummary = () => { const done = S.turns.every(t => t.first != null); const pulls = S.turns.map(t => t.pull).filter(Boolean); return { done, pulls }; };
const prevGate = window.TCCGate;
window.TCCGate = name => { const ok = prevGate ? prevGate(name) : true; if (ok && name === "case-advice") render(); return ok; };
render();
})();
