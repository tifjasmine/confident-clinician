/* Week 1 Reps: "choose, see the reaction". For each client moment the learner picks what they'd most likely say,
   the client reacts to that choice, and a one-line "what happened" explains it. They can try other options and,
   optionally, put it in their own words. The first pick is tallied to show the learner's most common pull.
   All client moments, options and reactions are fictional DRAFT wording for Tiffany's clinical review. No scores. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "tcc-w1-reps-v2";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const stage = t => esc(t).replace(/\(([^)]*)\)/g, "<i>($1)</i>");

const PULLS = { reassure: "Reassure", fix: "Jump to a fix", move: "Move on", defend: "Explain or defend", stay: "Stay curious" };
/* [what you say, pull tag, client's reaction, what happened] */
const REPS = [
  { id: "sam", who: "Sam, 26", when: "Second session", setup: "Sam has been describing panic attacks at work.",
    line: "Am I crazy for feeling this way? Just tell me if this is normal.",
    options: [
      ["“You’re not crazy. Panic is really common.”", "reassure", "(exhales) Okay. … So why can’t I make it stop?", "The relief is real but brief. The question underneath comes right back."],
      ["“What makes you worry that you might be crazy?”", "stay", "Because nobody else at work falls apart in meetings. I feel like the only one.", "It reaches the fear underneath: feeling alone in it."],
      ["“Let’s go over some breathing techniques for when it starts.”", "fix", "(nods) Sure. I’ve tried breathing stuff, though.", "Tools before understanding. Sam stays polite, and goes a little flat."],
      ["“It makes sense you’d want to know. A lot of people feel this. What’s it like for you?”", "stay", "Honestly? Embarrassing. I keep thinking everyone can tell.", "It normalizes without closing the door, then invites the experience."]
    ] },
  { id: "priya", who: "Priya, 41", when: "Third session", setup: "You ask how she’s been sleeping. She looks at the floor.",
    line: "(silence for about ten seconds)",
    options: [
      ["“Is sleep hard to talk about? We can come back to it.”", "move", "(looks up, relieved) Yeah, let’s skip it.", "Kind, but it ends the moment before she could use it."],
      ["(Wait quietly a little longer.)", "stay", "(quietly) I haven’t really slept since my mom’s diagnosis.", "The space let her decide to speak."],
      ["“Take your time.”", "stay", "(nods) … It’s just been a lot. My mom’s sick.", "A gentle cue that the silence is okay."],
      ["“Have you tried keeping a regular sleep schedule?”", "fix", "(shrugs) Kind of.", "Advice filled the silence and skipped whatever was coming up."]
    ] },
  { id: "maya", who: "Maya, 34", when: "Fourth session", setup: "You ask how the talk with her manager went. She laughs and glances at her phone.",
    line: "Oh, fine. I didn’t really bring it up. It’s not a big deal. … Sorry. You probably think I’m hopeless.",
    options: [
      ["“I don’t think you’re hopeless at all.”", "reassure", "(small smile) You have to say that.", "Kind, but she can’t take it in. The fear stays untouched."],
      ["“What made you expect I’d think that?”", "stay", "(pause) Because everyone else does. My dad used to say I never finish anything.", "Exploring her prediction opened an older story."],
      ["“Let’s make a plan so you can bring it up this week.”", "fix", "(sighs) Yeah. Okay.", "Straight to action. She agrees, but sounds deflated."],
      ["“You laughed when you said it wasn’t a big deal. What’s it like to say it out loud?”", "stay", "I guess I always say it’s fine. It’s easier than admitting I chickened out.", "Pointing to what she did let her look at it with you."]
    ] },
  { id: "alex", who: "Alex, 35", when: "Sixth session", setup: "Near the end of a session that felt good.",
    line: "Honestly, you get me way more than any therapist I’ve had.",
    options: [
      ["“Thank you, that means a lot.”", "move", "(smiles) Yeah. So, same time next week?", "Warm, and the moment closes there."],
      ["“I’m glad it feels that way. What feels different here?”", "stay", "You don’t rush me. The last one always had a worksheet ready.", "Receiving it, then getting curious, turned a compliment into information."],
      ["“I’m sure your other therapists were doing their best.”", "defend", "(pause) I guess.", "Defending the others left Alex feeling slightly corrected."],
      ["“What did you need from them that you didn’t get?”", "stay", "Honestly? Someone to just listen before trying to fix me.", "You learned what matters most to Alex in therapy."]
    ] },
  { id: "chris", who: "Chris, 47", when: "Eighth session", setup: "Voice raised, arms crossed.",
    line: "This is pointless. We talk and talk and nothing changes.",
    options: [
      ["“Change takes time. We’ve actually made some progress.”", "defend", "(louder) That’s what you always say.", "Defending the work escalated the moment."],
      ["“You’re frustrated. What did you hope would be different by now?”", "stay", "(pause) I thought I’d stop yelling at my kids. I haven’t.", "Staying steady brought out a concrete goal."],
      ["“Maybe we should try a different approach.”", "fix", "Like what?", "Changing course before understanding handed the problem back to you."],
      ["“I’m glad you said it. What would ‘something changing’ look like?”", "stay", "(arms loosen a little) Going a week without blowing up.", "Welcoming the challenge cooled the room."]
    ] },
  { id: "devon", who: "Devon, 52", when: "First session", setup: "Arms folded, short answers so far.",
    line: "My wife made me come. I don’t really see the point, but go ahead, ask your questions.",
    options: [
      ["“I hear you. Let’s start with some background.”", "move", "(shrugs) Fine. Grew up in Ohio …", "Moving on politely left his reluctance unspoken, and still in the room."],
      ["“Sounds like this wasn’t your idea. What do you make of her wanting you here?”", "stay", "… She says I shut down. (pause) Maybe she’s not wrong.", "Naming the reluctance lowered his guard."],
      ["“Therapy can really help, even if you’re unsure.”", "defend", "Sure.", "Selling therapy invited him to dig in."],
      ["“What would make this worth your time?”", "stay", "(thinks) If she’d stop being mad at me.", "Respecting his stance helped him find his own reason."]
    ] }
];

const blank = () => ({ i: 0, reps: {}, finished: false });   // reps[id] = { first, seen:[], own }
let S = Object.assign(blank(), load() || {});
const rec = id => S.reps[id] || (S.reps[id] = { first: null, seen: [], own: "" });

function tally() {
  const t = {}; REPS.forEach(r => { const f = S.reps[r.id]?.first; if (f != null) { const tag = r.options[f][1]; t[tag] = (t[tag] || 0) + 1; } });
  const pulls = Object.entries(t).filter(([k]) => k !== "stay").sort((a, b) => b[1] - a[1]);
  return { t, top: pulls[0] || null, stay: t.stay || 0 };
}

function railHTML() {
  return `<ol class="reps-rail">${REPS.map((r, i) => { const d = S.reps[r.id]?.first != null;
    return `<li><button type="button" class="${i === S.i && !S.finished ? "active" : ""} ${d ? "done" : ""}" data-rep="${i}"><span>${d ? "✓" : i + 1}</span>${esc(r.who.split(",")[0])}</button></li>`; }).join("")}</ol>`;
}

function repHTML() {
  const r = REPS[S.i], R = rec(r.id), last = S.i === REPS.length - 1, sel = R.seen[R.seen.length - 1], name = r.who.split(",")[0];
  const o = sel != null ? r.options[sel] : null;
  return `<div class="rep-client"><p class="rep-meta"><span>${esc(r.who)}</span>${esc(r.when)}</p><p class="rep-setup">${esc(r.setup)}</p>
      <blockquote class="rep-line">${r.line.startsWith("(") ? `<i>${esc(r.line)}</i>` : `“${esc(r.line)}”`}</blockquote></div>
    <div class="rep-work">
      <h2>${o ? "Try another, or move on." : "What would you most likely say?"}</h2>
      <div class="rep-options">${r.options.map(([say], k) => `<button type="button" class="${k === sel ? "selected" : ""} ${R.seen.includes(k) && k !== sel ? "seen" : ""}" data-opt="${k}">${stage(say)}${R.first === k ? `<small>Your first choice</small>` : ""}</button>`).join("")}</div>
      ${o ? `<div class="rep-reaction"><p class="reply-who">${esc(name)}</p><blockquote>${stage(o[2])}</blockquote><p class="rep-happened"><b>What happened:</b> ${esc(o[3])}</p></div>
        <label class="rep-own">In your own words <small>Optional</small><textarea data-own rows="2" placeholder="How would you say it?">${esc(R.own)}</textarea></label>` : ""}
      <div class="rep-actions">${o ? (last ? `<button class="primary" data-finish>See your pattern →</button>` : `<button class="primary" data-next>Next client →</button>`) : ""}</div>
    </div>`;
}

function summaryHTML() {
  const { top, stay } = tally();
  return `<div class="rep-summary"><p class="eyebrow">Week 1 reps</p><h2>Your first instincts this <em>week.</em></h2>
    <div class="rep-tally">${Object.entries(PULLS).map(([k, label]) => { const n = tally().t[k] || 0; return `<div class="${n ? "" : "zero"}"><span>${label}</span><b>${n}</b></div>`; }).join("")}</div>
    ${top && top[1] >= 2 ? `<div class="rep-edge"><span>Your pull to watch</span><p>${PULLS[top[0]]}</p><small>Your first choice ${top[1]} of ${REPS.length} times. Notice it next time it shows up in session.</small></div>`
      : `<div class="rep-edge"><span>This week</span><p>You stayed curious in ${stay} of ${REPS.length} moments.</p><small>Try putting the hardest ones in your own words.</small></div>`}
    <div class="rep-actions"><button class="ghost" data-restart>Practice again</button><button class="primary" data-go-profile>Add to my Confidence Profile →</button></div></div>`;
}

function render() {
  const host = $("[data-week1-blind-spot]"); if (!host) return;
  host.innerHTML = `<div class="advanced-shell reps-shell"><button class="back-link" data-go="week-1">← Back to Week 1</button>
    <header class="practice-head"><p class="eyebrow">Week 1 · Reps</p><h1>Notice before you <em>respond.</em></h1><p>Six short client moments. They get harder as you go.</p></header>
    <div class="reps-layout">${railHTML()}<article class="rep-card">${S.finished ? summaryHTML() : repHTML()}</article></div></div>`;
  bind(host);
}

function bind(host) {
  $$("[data-go]", host).forEach(b => b.onclick = () => window.TCCShowCourseScreen?.(b.dataset.go));
  const top = () => host.scrollIntoView({ behavior: "smooth", block: "start" });
  $$("[data-rep]", host).forEach(b => b.onclick = () => { S.i = +b.dataset.rep; S.finished = false; save(); render(); });
  $$("[data-opt]", host).forEach(b => b.onclick = () => { const R = rec(REPS[S.i].id), k = +b.dataset.opt; if (R.first == null) R.first = k; R.seen = R.seen.filter(x => x !== k).concat(k); save(); render(); });
  $("[data-own]", host)?.addEventListener("input", e => { rec(REPS[S.i].id).own = e.target.value; save(); });
  $("[data-next]", host)?.addEventListener("click", () => { S.i++; save(); render(); top(); });
  $("[data-finish]", host)?.addEventListener("click", () => { S.finished = true; save(); render(); top(); });
  $("[data-restart]", host)?.addEventListener("click", () => { S = blank(); save(); render(); });
  $("[data-go-profile]", host)?.addEventListener("click", () => window.TCCShowCourseScreen?.("w1-profile"));
}

window.TCCRenderReps = render;
window.TCCRepsSummary = () => { const done = REPS.filter(r => S.reps[r.id]?.first != null).length, { top } = tally();
  return { done, total: REPS.length, edge: top && top[1] >= 2 ? `Pull to watch: ${PULLS[top[0]]} (${top[1]} of ${REPS.length})` : "" }; };
render();
})();
