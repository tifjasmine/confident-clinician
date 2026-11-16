/* Week 1 Reps: six client moments, four steps each: Notice → Your pull → Respond → Your words.
   The learner picks what they'd most likely say, sees the client react, then compares the other three responses.
   The first pick is tallied to show the learner's most common pull.
   All client moments, options and reactions are fictional DRAFT wording for Tiffany's clinical review. No scores. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "tcc-w1-reps-v3";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const stage = t => esc(t).replace(/\(([^)]*)\)/g, "<i>($1)</i>");

const PULLS = { reassure: "Reassuring", fix: "Jumping to a fix", move: "Moving on", defend: "Explaining or defending", stay: "Staying curious" };
const DOES = { reassure: "Reassures", fix: "Jumps to a fix", move: "Moves on", defend: "Explains or defends", stay: "Stays curious" };
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

/* Step 1 (Notice) and step 2 (Your pull) content, per client. DRAFT wording for Tiffany's review. */
const NOTICE = {
 "sam": {
  "cues": [
   [
    "The word “crazy”",
    "A heavy, self-judging word. Sam may be more scared of what the panic says about them than of the panic itself.",
    1
   ],
   [
    "“Just tell me”",
    "Urgency. Sam wants relief fast, which can pull you to answer fast too.",
    0
   ],
   [
    "Asking you to decide what’s normal",
    "Sam is handing you the authority. Worth noticing before you take it.",
    0
   ]
  ],
  "worth": "Sam is frightened and wants you to settle it quickly. The fear underneath matters more than the answer.",
  "pull": "Most clinicians feel an instant pull to reassure here. It’s kind, and it comes fast."
 },
 "priya": {
  "cues": [
   [
    "She looks at the floor",
    "A shift in her body. Something landed.",
    0
   ],
   [
    "A long silence after a simple question",
    "Silence is information. She may be deciding whether to say more.",
    1
   ],
   [
    "Sleep seems to matter more than expected",
    "A “simple” topic is connected to something bigger.",
    0
   ]
  ],
  "worth": "A simple question touched something heavy. The most useful thing you can give right now is room.",
  "pull": "Silence pulls most of us to fill it, or to rescue the client from it."
 },
 "maya": {
  "cues": [
   [
    "The laugh and the glance at her phone",
    "A light tone over something that may feel heavy.",
    0
   ],
   [
    "“It’s not a big deal”",
    "Minimizing. It may protect her from disappointment, or from your reaction.",
    0
   ],
   [
    "The apology",
    "She apologizes to you, as if she let you down.",
    0
   ],
   [
    "“You probably think I’m hopeless”",
    "A prediction about your judgment. It brings you into the moment.",
    1
   ]
  ],
  "worth": "She minimizes, apologizes, then predicts your judgment. That prediction is the most important thing in the room.",
  "pull": "When a client is hard on themselves, the pull to reassure is strong."
 },
 "alex": {
  "cues": [
   [
    "“Way more than any therapist”",
    "Strong praise. Notice how it feels to receive it.",
    0
   ],
   [
    "Comparing you to past therapists",
    "Something was missing before. That’s useful information.",
    1
   ],
   [
    "It comes near the end of the session",
    "Timing matters. There may not be room to explore it fully today.",
    0
   ]
  ],
  "worth": "A compliment tells you what Alex values, and that something was missing before.",
  "pull": "Compliments feel good, so the pull is to accept them and move on."
 },
 "chris": {
  "cues": [
   [
    "Raised voice, crossed arms",
    "Frustration in the body. Your steadiness matters here.",
    0
   ],
   [
    "“Pointless”",
    "A strong word, and a challenge to you and the work.",
    0
   ],
   [
    "“Nothing changes”",
    "Underneath it: a hope that something would change, and disappointment that it hasn’t.",
    1
   ]
  ],
  "worth": "Under the anger is disappointment, and a hope that something would be different by now.",
  "pull": "Being challenged pulls most of us to defend the work."
 },
 "devon": {
  "cues": [
   [
    "“My wife made me come”",
    "He didn’t choose this. Reluctance is the first thing in the room.",
    1
   ],
   [
    "Arms folded, short answers",
    "Guarded. Pushing harder may make it stronger.",
    0
   ],
   [
    "“Go ahead, ask your questions”",
    "He hands you control while keeping his distance.",
    0
   ]
  ],
  "worth": "He’s telling you he didn’t choose this. That’s the first thing to talk about.",
  "pull": "Reluctance pulls us to sell therapy, or to push past it."
 }
};
const PULL_NOTES = {
  "Reassure": "Reassuring comes from care. The risk is that it answers before you understand what’s underneath.",
  "Fix it": "Fixing comes from wanting to help. The risk is skipping what the client needs to feel first.",
  "Move on": "Moving on can protect both of you from discomfort. The risk is leaving the important moment behind.",
  "Explain or defend": "Explaining feels steadying. The risk is that it puts your view at the center instead of theirs.",
  "Get curious": "Curiosity keeps the door open. Check that it’s real curiosity, not a technique you reach for to feel safe.",
  "Not sure": "That’s honest. Sometimes the pull shows up as freezing or going blank, and noticing that counts."
};
const PULL_CHOICES = ["Reassure", "Fix it", "Move on", "Explain or defend", "Get curious", "Not sure"];
const STEP_NAMES = ["Notice", "Your pull", "Respond", "Your words"];
const STARTERS = ["It sounds like…", "I noticed…", "What’s it like…", "Help me understand…"];
const blank = () => ({ i: 0, reps: {}, finished: false });   // reps[id] = { first, seen:[], own }
let S = Object.assign(blank(), load() || {});
const rec = id => { const R = S.reps[id] || (S.reps[id] = { first: null, seen: [], own: "" }); R.step = Math.min(R.step || 1, 4); R.cues = R.cues || []; return R; };

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
  const r = REPS[S.i], R = rec(r.id), N = NOTICE[r.id], name = r.who.split(",")[0], last = S.i === REPS.length - 1, st = R.step;
  const sel = R.seen[R.seen.length - 1];
  const say = t => stage(t).replace(/^“|”$/g, "");
  const said = t => t.startsWith("(") ? stage(t) : `“${say(t)}”`;
  const moment = `<div class="rv-moment"><p class="rv-who">${esc(r.who)} · ${esc(r.when)}</p><p class="rv-setup">${esc(r.setup)}</p>
    <blockquote>${r.line.startsWith("(") ? `<i>${esc(r.line)}</i>` : `“${esc(r.line)}”`}</blockquote></div>`;
  const progress = `<div class="rv-progress"><p>Step ${st} of 4 · ${STEP_NAMES[st - 1]}</p><span><i style="width:${st * 25}%"></i></span></div>`;
  const row = (attr, selected, multi, content) => `<button type="button" class="rv-choice${selected ? " on" : ""}" ${attr}><i class="rv-mark${multi ? " sq" : ""}" aria-hidden="true"></i><span>${content}</span></button>`;
  let q = "", hint = "", body = "", next = "";
  if (st === 1) { q = "What do you notice?";
    if (!R.cueShown) { hint = `Choose anything that stands out in what ${esc(name)} said or did.`;
      body = `<div class="rv-choices">${N.cues.map(([c]) => row(`data-cue="${esc(c)}"`, R.cues.includes(c), true, esc(c))).join("")}</div>`;
      next = R.cues.length ? `<button class="primary" data-cue-show>See what each one tells you</button>` : ""; }
    else { hint = "Here’s what each detail can tell you.";
      body = `<div class="rv-list">${N.cues.map(([c, m, key]) => { const mine = R.cues.includes(c); return `<div class="rv-item${mine ? " mine" : ""}"><i class="rv-mark sq${mine ? " filled" : ""}" aria-hidden="true"></i><div><p class="rv-item-title">${esc(c)}${key ? ` <em>Most telling</em>` : ""}</p><p>${esc(m)}</p></div></div>`; }).join("")}</div>
        <p class="rv-feedback"><b>Putting it together.</b> ${esc(N.worth)}</p>`;
      next = `<button class="primary" data-step-next>Next →</button>`; } }
  if (st === 2) { q = "What do you feel pulled to do?"; hint = "Be honest about your first impulse, before choosing any words.";
    body = `<div class="rv-choices two">${PULL_CHOICES.map(c => row(`data-pullpick="${esc(c)}"`, R.pull === c, false, esc(c))).join("")}</div>
      ${R.pull ? `<p class="rv-feedback"><b>${esc(R.pull)}.</b> ${esc(PULL_NOTES[R.pull])}</p><p class="rv-feedback"><b>With ${esc(name)}.</b> ${esc(N.pull)} Noticing it is what gives you a choice.</p>` : ""}`;
    next = R.pull ? `<button class="primary" data-step-next>Next →</button>` : ""; }
  if (st === 3) { q = "What would you most likely say?";
    const o = R.first != null ? r.options[R.first] : null;
    if (!o) { hint = "Pick the one closest to what you’d actually say. Go with your first instinct.";
      body = `<div class="rv-choices">${r.options.map((op, k) => row(`data-first="${k}"`, false, false, said(op[0]))).join("")}</div>`; }
    else { hint = `You chose this. Here’s how ${esc(name)} reacts.`;
      const verdict = R.first === r.pick ? "It’s what I’d most likely do too."
        : o.effect === "opens" ? "A strong choice. Compare it with the one I’d most likely choose, below."
        : "Worth knowing why. See how the others land below.";
      body = `<div class="rv-picked"><i class="rv-dot ${o.effect}" aria-hidden="true"></i><span>${said(o[0])}</span></div>
        <div class="rv-reply"><p class="rv-who">${esc(name)} responds</p><blockquote>${stage(o[2])}</blockquote></div>
        <p class="rv-feedback"><b>What happened.</b> ${esc(o[3])}</p>
        <p class="rv-feedback"><b>Can fit when.</b> ${esc(o.fit)}</p>
        <p class="rv-verdict ${o.effect}">${o.effect === "opens" ? "Opens it up" : "Closes it down"}. ${verdict}</p>
        <h3 class="rv-sub">How the other responses land</h3>
        <div class="rv-acc">${r.options.map((op, k) => { if (k === R.first) return ""; const open = k === sel; return `<div class="rv-acc-item${open ? " open" : ""}">
          <button type="button" data-opt="${k}" aria-expanded="${open}"><i class="rv-dot ${op.effect}" aria-hidden="true"></i><span><span class="rv-acc-say">${said(op[0])}</span>
            <span class="rv-acc-meta">${op.effect === "opens" ? "Opens it up" : "Closes it down"}${k === r.pick ? " · <b>what I’d most likely say</b>" : ""}</span></span><i class="rv-chev" aria-hidden="true"></i></button>
          ${open ? `<div class="rv-acc-body"><blockquote>${stage(op[2])}</blockquote><p><b>What happened.</b> ${esc(op[3])}</p><p><b>Can fit when.</b> ${esc(op.fit)}</p></div>` : ""}</div>`; }).join("")}</div>
        <p class="rv-feedback"><b>${R.first === r.pick ? "Why it works." : "Why I’d most likely choose the one marked."}</b> ${esc(r.why)}</p>`;
      next = `<button class="primary" data-step-next>Next →</button>`; } }
  if (st === 4) { q = "Now say it your way."; hint = `Say it out loud first, then write what you’d actually say to ${esc(name)}.`;
    body = `<p class="rv-feedback first"><b>The skill here.</b> ${esc(r.take)}</p>
      <div class="rv-starters">${STARTERS.map(t => `<button type="button" data-starter="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <textarea class="rv-input" data-own rows="3" placeholder="Your response to ${esc(name)}">${esc(R.own)}</textarea>`;
    next = `<button class="ghost" data-skip>Skip</button>${last ? `<button class="primary" data-finish>See your pattern →</button>` : `<button class="primary" data-next>Next client →</button>`}`; }
  return `<div class="rv">${moment}${progress}<h2 class="rv-q">${q}</h2><p class="rv-hint">${hint}</p>${body}
    <div class="rv-actions">${st > 1 ? `<button class="rv-back" data-step-back>← Back</button>` : "<span></span>"}<div>${next}</div></div></div>`;
}

function summaryHTML() {
  const { t, top } = tally();
  const done = REPS.filter(r => S.reps[r.id]?.first != null);
  const opened = done.filter(r => r.options[S.reps[r.id].first].effect === "opens");
  const retry = REPS.map((r, i) => [r, i]).filter(([r]) => { const f = S.reps[r.id]?.first; return f != null && r.options[f].effect === "closes"; });
  const missed = REPS.map((r, i) => [r, i]).filter(([r]) => S.reps[r.id]?.first == null);
  const own = REPS.filter(r => (S.reps[r.id]?.own || "").trim());
  const nm = r => esc(r.who.split(",")[0]);
  return `<div class="rv rv-sum"><p class="rv-who">Week 1 reps · your pattern</p><h2 class="rv-q">Are you on the right <em>track?</em></h2>
    <p class="rv-lead">Your first choice opened the conversation in <b>${opened.length} of ${done.length}</b> moment${done.length === 1 ? "" : "s"}. That’s the skill this week: noticing the pull, then choosing the response that leaves room for more.</p>
    ${missed.length ? `<p class="rv-hint">Not answered yet: ${missed.map(([r, i]) => `<button type="button" class="rv-link" data-rep="${i}">${nm(r)}</button>`).join(", ")}.</p>` : ""}
    <h3 class="rv-sub">Your first instincts</h3>
    <div class="rv-tally">${Object.entries(PULLS).map(([k, label]) => { const n = t[k] || 0; return `<div class="${n ? "" : "zero"}${k === "stay" ? " stay" : ""}"><span>${label}</span><i><u style="width:${done.length ? n / done.length * 100 : 0}%"></u></i><b>${n}</b></div>`; }).join("")}</div>
    ${top && top[1] >= 2 ? `<p class="rv-feedback"><b>Your pull to watch: ${PULLS[top[0]].toLowerCase()}.</b> It was your first choice ${top[1]} of ${done.length} times. It isn’t wrong, it’s just automatic. Notice it the next time it shows up in session.</p>` : ""}
    <h3 class="rv-sub">What the responses that opened things up had in common</h3>
    <ul class="rv-bullets"><li>They responded to the feeling under the words, not just the question.</li><li>They used something the client actually said or did.</li><li>They left room for the client to say more, instead of wrapping it up.</li></ul>
    ${retry.length ? `<h3 class="rv-sub">Worth another try</h3><div class="rv-list">${retry.map(([r, i]) => `<button type="button" class="rv-item rv-retry" data-rep="${i}" data-retry><div><p class="rv-item-title">${nm(r)}</p><p>${esc(r.take)}</p></div><i class="rv-chev side" aria-hidden="true"></i></button>`).join("")}</div>` : ""}
    ${own.length ? `<h3 class="rv-sub">In your own words</h3><div class="rv-list">${own.map(r => `<div class="rv-item"><div><p class="rv-item-title">${nm(r)}</p><p>“${esc(S.reps[r.id].own)}”</p></div></div>`).join("")}</div>` : ""}
    <div class="rv-actions"><button class="rv-back" data-restart>Start all six again</button><div><button class="primary" data-go-profile>Add to my Confidence Profile →</button></div></div></div>`;
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
  const top = () => host.scrollIntoView({ behavior: "smooth", block: "start" }), r = REPS[S.i], R = rec(r.id), rr = () => { save(); render(); };
  $$("[data-rep]", host).forEach(b => b.onclick = () => { S.i = +b.dataset.rep; S.finished = false;
    if (b.hasAttribute("data-retry")) { const X = rec(REPS[S.i].id); X.first = null; X.seen = []; X.step = 3; } rr(); top(); });
  $$("[data-gostep]", host).forEach(b => b.onclick = () => { R.step = +b.dataset.gostep; rr(); });
  $$("[data-cue]", host).forEach(b => b.onclick = () => { const c = b.dataset.cue; R.cues = R.cues.includes(c) ? R.cues.filter(x => x !== c) : [...R.cues, c]; rr(); });
  $("[data-cue-show]", host)?.addEventListener("click", () => { R.cueShown = true; rr(); });
  $$("[data-pullpick]", host).forEach(b => b.onclick = () => { R.pull = b.dataset.pullpick; rr(); });
  $$("[data-first]", host).forEach(b => b.onclick = () => { const k = +b.dataset.first; R.first = k; R.seen = [k]; rr(); });
  $$("[data-opt]", host).forEach(b => b.onclick = () => { const k = +b.dataset.opt; R.seen = R.seen.filter(x => x !== k).concat(k); rr(); });
  $$("[data-starter]", host).forEach(b => b.onclick = () => { const t = $("[data-own]", host); t.value = (t.value ? t.value.trimEnd() + " " : "") + b.dataset.starter.replace("…", " "); R.own = t.value; save(); t.focus(); });
  $("[data-own]", host)?.addEventListener("input", e => { R.own = e.target.value; save(); });
  $("[data-step-next]", host)?.addEventListener("click", () => { R.step++; rr(); top(); });
  $("[data-step-back]", host)?.addEventListener("click", () => { R.step = Math.max(1, R.step - 1); rr(); top(); });
  const advance = () => { if (S.i < REPS.length - 1) { S.i++; rr(); top(); } else { S.finished = true; rr(); top(); } };
  $("[data-next]", host)?.addEventListener("click", advance);
  $("[data-skip]", host)?.addEventListener("click", advance);
  $("[data-finish]", host)?.addEventListener("click", () => { S.finished = true; rr(); top(); });
  $("[data-restart]", host)?.addEventListener("click", () => { S = blank(); rr(); });
  $("[data-go-profile]", host)?.addEventListener("click", () => window.TCCShowCourseScreen?.("w1-profile"));
}

window.TCCRenderReps = render;
window.TCCRepsSummary = () => { const done = REPS.filter(r => S.reps[r.id]?.first != null).length, { top } = tally();
  return { done, total: REPS.length, edge: top && top[1] >= 2 ? `Pull to watch: ${PULLS[top[0]]} (${top[1]} of ${REPS.length})` : "" }; };
render();
})();
