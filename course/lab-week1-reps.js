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

const EXTRA = {"sam": [3, "It answers the question honestly and still opens the door. Sam gets some relief, and you learn what the worry is about.", "“Is this normal?” usually asks for more than a yes. Answer briefly, then get curious.", [["closes", "Brief normalizing can calm acute panic. It works best after you understand the worry."], ["opens", "Best when you sense shame or fear under the question."], ["closes", "Tools fit once Sam wants them and you understand the pattern, often later in the session."], ["opens", "Fits most times a client asks whether they’re normal: some relief, then curiosity."]]], "priya": [1, "Silence after a meaningful question is often the client thinking. A few more seconds gave her room to decide.", "Silence isn’t a problem to solve. Notice your urge to fill it, then choose.", [["closes", "Right if she seems flooded or not ready. Say you’ll come back to it, and do."], ["opens", "Fits when the silence feels like thinking, not confusion or distress."], ["opens", "A gentle way to make silence feel allowed, especially if she seems anxious about it."], ["closes", "Sleep habits matter, after you understand what’s keeping her up."]]], "maya": [1, "She made a prediction about you. Exploring it, instead of correcting it, opened something older and important.", "When a client predicts your judgment, get curious about the prediction before you correct it.", [["closes", "Some reassurance can help in an established relationship, ideally after exploring the fear."], ["opens", "Fits when the client names what they think you think."], ["closes", "Planning fits after she feels understood, and only if she wants it."], ["opens", "Works well when the relationship feels safe enough to notice behavior out loud."]]], "alex": [1, "Receiving the compliment, then getting curious, turns it into information about what actually helps Alex.", "Compliments pull on us too. Receive them, then get curious about what’s working.", [["closes", "Fine at the very end of a session. You can return to it next time."], ["opens", "Fits almost any time a client tells you something is working."], ["closes", "Rarely needed. If Alex were harshly criticizing someone, you’d explore that instead."], ["opens", "Useful, with warmth, so it doesn’t sound like you’re digging at past therapists."]]], "chris": [1, "Steady acknowledgment plus a question about hopes turned frustration into a clear goal.", "When a client challenges the work, treat it as information, not an attack.", [["closes", "Reviewing progress helps later, once Chris feels heard, and only if it’s accurate."], ["opens", "Fits when frustration is high and you don’t yet know what they hoped for."], ["closes", "Changing approach may be right. Decide it together, after you understand what isn’t working."], ["opens", "Welcoming the challenge shows that feedback is safe here."]]], "devon": [1, "Naming his reluctance out loud made it something you can talk about together.", "Reluctance is the first thing to talk about, not something to get past.", [["closes", "Background matters. Once his reluctance is named, he may engage with it more."], ["opens", "Fits most first sessions where someone didn’t choose to come."], ["closes", "Information about therapy helps later, when he asks for it."], ["opens", "A strong alternative. It respects his autonomy and finds his own reason."]]]};
REPS.forEach(r => { const [pick, why, take, opts] = EXTRA[r.id]; r.pick = pick; r.why = why; r.take = take; r.options.forEach((o, k) => { o.effect = opts[k][0]; o.fit = opts[k][1]; }); });
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
      <h2>${o ? "Here’s what each response does." : "What would you most likely say?"}</h2>${o ? `<p class="task-sub">Tap any response to see how ${esc(name)} reacts.</p>` : ""}
      <div class="rep-options${R.first != null ? " explained" : ""}">${r.options.map((op, k) => { const [say, tag] = op; return `<button type="button" class="${k === sel ? "selected" : ""}" data-opt="${k}">
        ${R.first != null ? `<span class="opt-tags"><em class="eff ${op.effect}">${op.effect === "opens" ? "Opens it up" : "Closes it down"}</em><em>${PULLS[tag]}</em>${k === r.pick ? `<em class="pick">What I’d most likely say</em>` : ""}${R.first === k ? `<em class="first">Your first choice</em>` : ""}</span>` : ""}
        <span class="opt-say">${stage(say)}</span>
        ${R.first != null ? `<span class="opt-fit"><b>Can fit when:</b> ${esc(op.fit)}</span>` : ""}</button>
        ${k === sel ? `<div class="rep-reaction"><p class="reply-who">${esc(name)} responds</p><blockquote>${stage(op[2])}</blockquote><p class="rep-happened"><b>What happened:</b> ${esc(op[3])}</p></div>` : ""}`; }).join("")}</div>
      ${o ? `<div class="rep-why"><span>Why I’d most likely say that</span><p>${esc(r.why)}</p></div>
        <div class="rep-take"><span>The skill here</span><p>${esc(r.take)}</p></div>
        <label class="rep-own">In your own words <small>Optional</small><textarea data-own rows="2" placeholder="How would you say it?">${esc(R.own)}</textarea></label>` : ""}
      <div class="rep-actions">${o ? (last ? `<button class="primary" data-finish>See your pattern →</button>` : `<button class="primary" data-next>Next client →</button>`) : ""}</div>
    </div>`;
}

function summaryHTML() {
  const { t, top } = tally();
  const opened = REPS.filter(r => { const f = S.reps[r.id]?.first; return f != null && r.options[f].effect === "opens"; });
  const retry = REPS.map((r, i) => [r, i]).filter(([r]) => { const f = S.reps[r.id]?.first; return f != null && r.options[f].effect === "closes"; });
  const own = REPS.filter(r => (S.reps[r.id]?.own || "").trim());
  return `<div class="rep-summary"><p class="eyebrow">Week 1 reps · your pattern</p><h2>Are you on the right <em>track?</em></h2>
    <div class="rep-score"><b>${opened.length} of ${REPS.length}</b><p>Your first choice opened the conversation in ${opened.length} of ${REPS.length} moments. That’s the skill this week: noticing the pull, and choosing the response that leaves room for more.</p></div>
    <p class="sum-label">Your first instincts</p>
    <div class="rep-tally">${Object.entries(PULLS).map(([k, label]) => { const n = t[k] || 0; return `<div class="${n ? "" : "zero"}"><span>${label}</span><b>${n}</b></div>`; }).join("")}</div>
    ${top && top[1] >= 2 ? `<div class="rep-edge"><span>Your pull to watch</span><p>${PULLS[top[0]]}</p><small>Your first choice ${top[1]} of ${REPS.length} times. It isn’t wrong, it’s just automatic. Notice it next time it shows up in session.</small></div>` : ""}
    <p class="sum-label">What the responses that opened things up had in common</p>
    <ul class="sum-list"><li>They responded to the feeling under the words, not just the question.</li><li>They used something the client actually said or did.</li><li>They left room for the client to say more, instead of wrapping it up.</li></ul>
    ${retry.length ? `<p class="sum-label">Worth another try</p><div class="sum-retry">${retry.map(([r, i]) => `<button type="button" data-rep="${i}"><b>${esc(r.who.split(",")[0])}</b><span>${esc(r.take)}</span></button>`).join("")}</div>` : ""}
    ${own.length ? `<p class="sum-label">In your own words</p><div class="sum-own">${own.map(r => `<div><span>${esc(r.who.split(",")[0])}</span><p>“${esc(S.reps[r.id].own)}”</p></div>`).join("")}</div>` : ""}
    <div class="rep-actions"><button class="ghost" data-restart>Practice all six again</button><button class="primary" data-go-profile>Add to my Confidence Profile →</button></div></div>`;
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
