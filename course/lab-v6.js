/* Clinical Confidence Lab v6 "Workspace" student experience.
   Screens: sign in, Home, My week, Rep, Day 1 Baseline, Rep Room, Playbook, My growth.
   Data and copy live in lab-v6-data.js. Learner work is saved in this browser (localStorage) for the preview;
   TODO: move progress and answers to authenticated storage, and replace the reviewer toggle with server-side drip. */
(function () {
  const D = window.TCC6;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const q = t => `“${esc(t)}”`;

  /* Preview sign-in: the same client-side test gate as the existing Lab preview. Not real authentication. */
  const PREVIEW_SESSION = "tccLabStudentPreview";
  const PREVIEW_EMAIL = "studentpreview@theconfidentclinician.me";
  const PREVIEW_PASSWORD = "LabPreview2026!";

  const KEY = "tcc-v6-v1";
  const blank = () => ({ welcome: false, base: {}, baseIdx: 0, sealed: false, watched: {}, reps: {}, steps: {}, reflect: {}, profile: {}, lab: {}, sim: { v: 3 }, reviewer: false });
  let S = blank();
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage unavailable */ }
  if (!S.sim || S.sim.v !== 3) S.sim = { v: 3 }; /* simulation content changed (8-moment text simulations): start it fresh */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };

  const REP = id => D.REPS.find(r => r.id === id);
  const R = id => (S.reps[id] = S.reps[id] || { move: "", aim: null, map: {}, gap: null, beat2: "", line: "", saved: false, attempts: [] });
  const repSaved = id => !!(S.reps[id] && S.reps[id].saved);

  /* Week 1 progress */
  const stepDone = s => {
    if (s.type === "day1") return S.welcome && S.sealed;
    if (s.type === "lesson") return !!S.watched[s.key] && repSaved(s.rep);
    return !!S.steps[s.key];
  };
  const doneCount = () => D.WEEK1.filter(stepDone).length;
  const curIdx = () => { const i = D.WEEK1.findIndex(s => !stepDone(s)); return i === -1 ? D.WEEK1.length : i; };
  const unlocked = i => S.reviewer || i <= curIdx();
  const weekOpen = n => n === 1 || S.reviewer;
  const lessonReps = () => D.REPS.filter(r => !r.pending);
  const bankLines = () => lessonReps().filter(r => repSaved(r.id) && (S.reps[r.id].line || "").trim());
  const repsCompleted = () => lessonReps().filter(r => repSaved(r.id)).length + (S.sealed ? 4 : 0);
  const anyProgress = () => doneCount() > 0 || S.welcome || Object.keys(S.base).length > 0 || Object.keys(S.reps).length > 0;

  /* Routing: #home · #week/<step> · #rep/<id> · #baseline · #reproom · #playbook · #growth */
  const route = () => { const [scr, arg] = (location.hash.slice(1) || "home").split("/"); return { scr: D.HEADS[scr] ? scr : "home", arg: arg ? decodeURIComponent(arg) : null }; };
  const go = h => { if (location.hash === "#" + h) render(); else location.hash = h; };
  let lastScr = null;

  const NAV = [["home", "Home", "Home"], ["week", "My week", "Week"], ["reproom", "Rep Room", "Reps"], ["playbook", "Playbook", "Playbook"], ["growth", "My growth", "Growth"]];

  function render() {
    const signedIn = sessionStorage.getItem(PREVIEW_SESSION) === "1";
    $("[data-login]").hidden = signedIn;
    $("[data-app]").hidden = !signedIn;
    if (!signedIn) return;
    const { scr, arg } = route();
    const navKey = scr === "rep" ? (REP(arg) && REP(arg).week === 1 ? "week" : "reproom") : scr === "baseline" ? "week" : scr;
    const tabs = NAV.map(([k, label, short], i) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${i === -1 ? short : label}</button>`).join("");
    $("[data-tabs]").innerHTML = tabs;
    $("[data-bottom]").innerHTML = NAV.map(([k, , short]) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${short}</button>`).join("");
    $$("[data-preview-toggle]").forEach(pv => { pv.textContent = S.reviewer ? "Preview · all open" : "Preview"; pv.classList.toggle("on", S.reviewer); pv.setAttribute("aria-pressed", S.reviewer); });

    const views = { home: homeView, week: weekView, rep: repView, baseline: baselineView, reproom: roomView, playbook: playbookView, growth: growthView };
    const v = views[scr](arg);
    $("[data-side]").innerHTML = sideHTML(navKey, scr === "week" ? v.sel : -1);
    $(".v6-frame").classList.toggle("side-min", !!SB.min);
    const mb = $("[data-sb-min]"); mb.textContent = SB.min ? "›" : "‹"; mb.setAttribute("aria-label", SB.min ? "Expand menu" : "Collapse menu"); mb.title = mb.getAttribute("aria-label");
    const head = $("[data-head]");
    head.innerHTML = v.hero || headHTML(scr, v);
    head.className = v.hero ? "v6-head is-hero" : "v6-head";
    const sh = $(".v6-shell");
    sh.classList.toggle("solo", !!v.solo || !["rep", "week"].includes(scr));
    sh.classList.toggle("aside-narrow", scr === "week");
    const col = $("[data-view]");
    col.className = "v6-col" + (v.tight ? " tight" : "");
    col.innerHTML = v.html;
    $("[data-aside]").innerHTML = v.solo ? "" : asideHTML(scr, v);
    $("[data-foot]").textContent = "Use fictional or generalized examples only. Never enter identifiable client information. This course is professional education and does not replace clinical supervision or independent clinical judgment.";
    if (scr !== lastScr) scrollTo({ top: 0 });
    lastScr = scr;
    bind(scr, arg);
    if (v.after) v.after();
  }

  /* Italic terracotta accent on the last word of a heading */
  const accent = t => { const m = String(t).match(/^(.*\s)(\S+)$/); return m ? `${esc(m[1])}<em>${esc(m[2])}</em>` : esc(t); };
  function headHTML(scr, v) {
    const h = D.HEADS[scr];
    let title = v.title || h[0];
    if (scr === "home") title = anyProgress() ? "Welcome back" : "Welcome to the Lab";
    const crumb = v.crumb ? `<div class="v6-crumb"><button type="button" data-go="${v.crumb[2]}">${esc(v.crumb[0])}</button> <span aria-hidden="true">/</span> ${esc(v.crumb[1])}</div>` : "";
    const principle = scr === "home" ? `<div class="v6-principle"><span>Learn</span><i aria-hidden="true">→</i><span>Practice</span><i aria-hidden="true">→</i><span>Reflect</span><i aria-hidden="true">→</i><span>Improve</span></div>` : "";
    const eyebrow = { rep: "Practice · Rep", baseline: "Day 1 · Your starting point", reproom: "Practice", playbook: "Your work", growth: "Your work" }[scr];
    return `<div>${crumb}${eyebrow && !crumb ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}<h1>${v.plain ? esc(title) : accent(title)}</h1><div class="sub">${esc(v.sub || h[1])}</div></div>${principle}`;
  }

  /* ---------- Sidebar (desktop) ---------- */
  /* Sidebar open/closed state: a per-viewer convenience only */
  const SBKEY = "tcc-v6-sidebar";
  let SB = { min: false, closed: { later: true } };
  try { SB = Object.assign(SB, JSON.parse(localStorage.getItem(SBKEY) || "{}")); } catch (e) { /* storage unavailable */ }
  const sbSave = () => { try { localStorage.setItem(SBKEY, JSON.stringify(SB)); } catch (e) { /* ignore */ } };
  function sideHTML(navKey, sel) {
    const cur = curIdx();
    const item = (go, label, on, chip, chipCls) => `<button type="button" class="sb-item${on ? " on" : ""}" data-go="${go}"${on ? ' aria-current="page"' : ""}><i aria-hidden="true"></i><span>${esc(label)}</span>${chip ? `<em class="${chipCls || ""}">${chip}</em>` : ""}</button>`;
    const sec = (key, label, count, body) => { const open = !SB.closed[key]; return `<button type="button" class="sb-sec" data-sb-sec="${key}" aria-expanded="${open}"><span>${esc(label)}</span>${count ? `<b>${count}</b>` : ""}<i aria-hidden="true">${open ? "−" : "+"}</i></button><div class="sb-group"${open ? "" : " hidden"}>${body}</div>`; };
    const steps = D.WEEK1.map((st, i) => {
      const done = stepDone(st), locked = !unlocked(i);
      return item("week/" + st.key, st.short, navKey === "week" && sel === i, done ? "✓" : i === cur ? "Next" : "", done ? "done" : "next").replace('class="sb-item', `class="sb-item${locked ? " dim" : ""}`);
    }).join("");
    return sec("today", "Today", "", item("home", "Home", navKey === "home"))
      + sec("week1", "Week 1 · Notice", `${doneCount()}/${D.WEEK1.length}`, steps)
      + sec("practice", "Practice", "", item("reproom", "Rep Room", navKey === "reproom") + item("playbook", "Clinical Playbook", navKey === "playbook") + item("growth", "My growth", navKey === "growth"))
      + sec("later", "Coming up", "", D.WEEKS.slice(1).map(w => `<div class="sb-item off"><i aria-hidden="true"></i><span>Week ${w.n} · ${esc(w.theme)}</span><em>Soon</em></div>`).join(""));
  }

  /* ---------- Aside ---------- */
  function statsHTML() {
    const d = doneCount(), t = D.WEEK1.length, rc = repsCompleted(), bl = bankLines().length;
    const row = (label, value, pct, terra) => `<div><div class="row"><span>${label}</span><b>${value}</b></div><div class="bar thin${terra ? " terra" : ""}"><i style="width:${Math.round(pct)}%"></i></div></div>`;
    return `<div class="card" style="padding:20px 22px"><h2 class="h" style="font-size:15px;margin:0 0 14px">Your progress</h2><div class="stats">
      ${row("Week 1 steps", `${d} of ${t}`, d / t * 100)}${row("Reps completed", `${rc} of 20`, rc / 20 * 100, true)}${row("“What I Say When…” lines", `${bl} of 12`, Math.min(bl / 12, 1) * 100)}</div></div>`;
  }
  const STAGES = [["Start", ["day1"]], ["Learn + practice", ["l1", "l2", "l3", "demo"]], ["Apply it", ["lab", "sim"]], ["Wrap up", ["reflect", "save"]]];
  function stepperHTML(sel) {
    const cur = curIdx();
    const row = i => {
      const st = D.WEEK1[i], done = stepDone(st), isCur = i === cur, locked = !unlocked(i);
      const status = done ? "Done" : isCur ? "Up next" : locked ? "Locked" : "Open";
      return `<button type="button" class="rail-row${i === sel ? " sel" : ""}${locked ? " future" : ""}" data-go="week/${st.key}"${i === sel ? ' aria-current="step"' : ""}><span class="ico lg${done ? " done" : isCur ? " cur" : ""}" aria-hidden="true">${done ? "✓" : i + 1}</span><span class="tt"><b>${esc(st.short)}</b><small>${esc(st.label)} · ${status}</small></span></button>`;
    };
    return `<div class="card rail"><div class="h">Week 1 steps</div><div class="s">${doneCount()} of ${D.WEEK1.length} done · about 2.5 hours</div>${STAGES.map(([name, keys]) =>
      `<div class="stage">${esc(name)}</div>${keys.map(k => row(D.WEEK1.findIndex(x => x.key === k))).join("")}`).join("")}</div>`;
  }
  function repRailHTML(stage, saved) {
    return `<div class="card rail"><div class="h">The Rep</div><div class="s">3–5 minutes, one client moment</div>${D.REP_STEPS.map((t, i) => {
      const n = i + 1, done = n < stage || (saved && n === 6), cur = n === stage && !saved;
      return `<div class="rail-row${cur ? " cur" : ""}${n > stage ? " future" : ""}"><span class="ico${done ? " done" : cur ? " cur" : ""}" aria-hidden="true">${done ? "✓" : n}</span><span class="tt"><b style="font-weight:${cur ? 600 : 500}">${esc(t)}</b></span></div>`;
    }).join("")}</div>
    <div class="card checks"><div class="h">The Three Checks</div>${D.CHECKS.map(([t, d], i) => `<div class="c"><i>${i + 1}</i><span>${esc(t)}<small>${esc(d)}</small></span></div>`).join("")}</div>`;
  }
  function asideHTML(scr, v) {
    if (scr === "rep") return v.rail || "";
    if (scr === "week") return stepperHTML(v.sel);
    return "";
  }

  /* ---------- Home ---------- */
  function nextInfo() {
    const i = curIdx();
    if (i >= D.WEEK1.length) return { tag: "Week 1 complete", title: "Week 2 opens next", meta: "Getting Unstuck in the Room · Decide", cta: "Review Week 1", go: "week" };
    const s = D.WEEK1[i];
    if (s.type === "day1") return { tag: "Start here", title: "Welcome + Day 1 Baseline", meta: "A short welcome from Tiffany, then four client moments to see where you’re starting", cta: anyProgress() ? "Continue Day 1" : "Start Day 1", go: "week/day1" };
    if (s.type === "lesson") { const r = REP(s.rep); return { tag: s.kind, title: s.title, meta: `Watch the lesson, then practice with ${r.client}`, cta: "Continue", go: "week/" + s.key }; }
    return { tag: s.kind, title: s.title, meta: s.meta, cta: "Continue", go: "week/" + s.key };
  }
  function homeView() {
    const n = nextInfo(), d = doneCount(), t = D.WEEK1.length;
    const hero = `<div class="hm-head"><div class="v6-label">${anyProgress() ? "Welcome back" : "Welcome"} · Week 1 of 4</div>
      <h1 class="display">Build confidence through <em>practice,</em> not performance.</h1>
      </div>`;
    const html = `
      <section class="floor">
        <div class="fl-main">
          <div class="fl-top"><span class="fl-k">Up next</span><span class="fl-m">Week 1 · ${d} of ${t} steps done</span></div>
          <h2>${esc(n.title)}</h2>
          <p class="fl-sub">${esc(n.meta)}.</p>
          <div class="fl-act"><button type="button" class="btn-gold" data-go="${n.go}">${esc(n.cta)}</button><button type="button" class="btn-ghost" data-go="week">See all Week 1 steps</button></div>
        </div>
      </section>
      <section class="card weeks4">
        <div class="w4-head"><h2>Four weeks. <em>One at a time.</em></h2><p>Each week opens once the last week’s practice is done.</p></div>
        <ol>${D.WEEKS.map(w => {
          const cur = w.n === 1, open = weekOpen(w.n);
          const status = cur ? (d ? `${d} of ${t} done` : "Open now") : open ? "Preview open" : `Opens after Week ${w.n - 1}`;
          return `<li class="${cur ? "cur" : ""}"><span class="n">0${w.n}</span><span class="tx"><b>${esc(w.title)}</b><small>${esc(w.theme)} · ${esc(w.question)}</small></span>${cur ? `<button type="button" class="v6-link" data-go="week">${status} →</button>` : `<em>${status}</em>`}</li>`;
        }).join("")}</ol>
      </section>
      <div class="pick">
        <h2>${anyProgress() ? "Pick up where you <em>left off.</em>" : "Everything else, <em>in one place.</em>"}</h2>
        <div class="pick-grid">${[
          ["playbook", D.IMG.b, "Clinical Playbook", "Your “What I Say When…” lines, saved as you go.", "Open your Playbook"],
          ["reproom", D.IMG.a, "Rep Room", "Extra Reps in the same format. Never blocks your progress.", "Browse Reps"],
          ["growth", D.IMG.c, "My growth", "Your Day 1 answers. In Week 4, see how far you’ve come.", "See your growth"]
        ].map(([k, img, t2, d2, cta]) => `<button type="button" class="pick-card" data-go="${k}"><img src="${img}" alt=""><span class="pc"><small>${esc(t2)}</small><b>${esc(d2)}</b><span class="go">${esc(cta)} →</span></span></button>`).join("")}</div>
      </div>`;
    return { html, hero, solo: true };
  }

  /* ---------- My week ---------- */
  const video = (id, img, isVideo) => {
    const wid = id && D.VIDEOS[id];
    if (wid) return `<div class="media"><iframe src="https://fast.wistia.net/embed/iframe/${esc(wid)}?videoFoam=true&seo=false" title="Lesson video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    return `<div class="media"><img src="${img}" alt="">${isVideo ? `<div class="play"><span aria-hidden="true">▶</span></div><span class="soon">Video coming soon</span>` : ""}</div>`;
  };
  const itemsHTML = (label, items) => `<div class="items"><div class="lab">${esc(label)}</div>${items.map(([k, a, b, done]) => `<div class="row"><span class="k${done ? " done" : ""}">${done ? "✓" : esc(k)}</span><span class="t"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ""}</span></div>`).join("")}</div>`;

  const howHTML = (title, steps, foot) => `<div class="how"><div class="how-h">${esc(title)}</div><ol>${steps.map(([t, d], i) => `<li><span class="num lg">${i + 1}</span><span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`).join("")}</ol>${foot ? `<div class="how-f">${esc(foot)}</div>` : ""}</div>`;
  /* ---------- Week 1 Lab: The Clinical Blind Spot ---------- */
  const LAB_STEPS = ["Spot It", "Seen vs. Supplied", "The Pull", "Rewrite line 4"];
  const transcriptHTML = (L, pickable) => `<ol class="transcript">${D.LAB.lines.map(([who, text, act], i) => {
    const n = i + 1, picked = L.turnPick === n, isTurn = L.turnPick && n === D.LAB.turn;
    const inner = `<span class="ln">${n}</span><span class="tx"><b>${who}</b>${q(text)}${act ? ` <i>(${esc(act)})</i>` : ""}</span>`;
    return `<li class="${who === "Jordan" ? "client" : "ther"}${picked ? " picked" : ""}${isTurn ? " turn" : ""}">${pickable ? `<button type="button" data-lab-turn="${n}" aria-pressed="${picked}">${inner}</button>` : `<div>${inner}</div>`}</li>`;
  }).join("")}</ol>`;
  const chipsHTML = (attr, opts, cur, ans) => `<div class="chips-row">${opts.map(([k, l]) => `<button type="button" class="chip${cur === k && ans ? (k === ans ? " right" : " wrong") : ""}" ${attr}="${k}" aria-pressed="${cur === k}">${cur === k && k === ans ? "✓ " : ""}${esc(l)}</button>`).join("")}</div>`;
  const fb = (pick, ans, label) => pick ? `<span class="ans${pick === ans ? "" : " miss"}">${pick === ans ? `Yes, ${esc(label)}.` : `Closer to ${esc(label)}.`}</span>` : "";
  function labHTML() {
    const L = S.lab, st = Math.min(L.step || 0, 3), A = D.LAB;
    const head = `<div class="flow-head"><span class="v6-pill blush">${st + 1} of 4 · ${LAB_STEPS[st]}</span><div class="flow-dots" aria-hidden="true">${LAB_STEPS.map((_, i) => `<span class="${i < st ? "done" : i === st ? "on" : ""}"></span>`).join("")}</div></div>`;
    const peek = `<details class="peek"><summary>Show the session again</summary>${transcriptHTML(L, false)}</details>`;
    let body = "", ok = false;
    if (st === 0) {
      body = `<p class="flow-q">Read the session. Then tap the line where it turned.</p><p class="flow-sub">${esc(A.intro)}</p>${transcriptHTML(L, true)}
        ${L.turnPick ? `<div class="reveal"><b>The turn: line ${A.turn}.</b> ${esc(A.turnWhy)}${L.turnPick !== A.turn ? `<span class="you">You picked line ${L.turnPick}.</span>` : ""}</div>` : ""}`;
      ok = !!L.turnPick;
    }
    if (st === 1) {
      const so = L.sort || {};
      body = `<p class="flow-q">Did Jordan say it, or did the therapist fill it in?</p><p class="flow-sub"><b>Seen</b> means Jordan actually said or showed it. <b>Supplied</b> means the therapist assumed it.</p>${peek}
        <div class="sort">${A.sort.map(([t, ans, note], i) => {
          const pick = so[i];
          return `<div class="sort-row${pick ? " answered" : ""}"><span class="st">${esc(t)}</span><span class="sb">${["seen", "supplied"].map(k => `<button type="button" class="chip${pick === k ? (k === ans ? " right" : " wrong") : ""}" data-lab-sort="${i}" data-v="${k}" aria-pressed="${pick === k}">${pick === k && k === ans ? "✓ " : ""}${k === "seen" ? "Seen" : "Supplied"}</button>`).join("")}</span>
            ${pick && pick !== ans ? `<span class="ans miss">Actually ${ans === "seen" ? "Seen" : "Supplied"}${note ? `: ${esc(note)}` : ""}.</span>` : pick && note ? `<span class="ans">${esc(note[0].toUpperCase() + note.slice(1))}.</span>` : ""}</div>`;
        }).join("")}</div>`;
      ok = A.sort.every((_, i) => so[i]);
    }
    if (st === 2) {
      const pulls = D.PULLS.map(([t]) => [t, t]);
      body = `<p class="flow-q">What was driving the therapist?</p>${peek}
        <div class="field">Which Pull drove line 4? <small>${q(A.lines[3][1])}</small>${chipsHTML("data-lab-p4", pulls, L.p4, A.pull4)}${fb(L.p4, A.pull4, A.pull4)}</div>
        <div class="field">Which Pull drove line 8? <small>${q(A.lines[7][1])}</small>${chipsHTML("data-lab-p8", pulls, L.p8, A.pull8)}${fb(L.p8, A.pull8, A.pull8)}</div>
        <div class="field">Which gap? <small>Knowledge, skill, pressure, or support</small>${chipsHTML("data-lab-gap", D.GAPS.map(([k, l]) => [k, l]), L.gap, A.gap)}${L.gap ? `<span class="ans${L.gap === A.gap ? "" : " miss"}">${esc(A.gapWhy)}</span>` : ""}</div>`;
      ok = !!(L.p4 && L.p8 && L.gap);
    }
    if (st === 3) {
      const pz = L.pause || {}, mv = L.move || "";
      body = `<p class="flow-q">Now you’re the therapist. Rewrite line 4.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">J</span><span class="col"><span class="who">Jordan · line 3</span><span class="said md">${q(A.lines[2][1])}</span></span></div>
        <div class="orig"><small>What the therapist said (line 4)</small>${q(A.lines[3][1])}</div>
        <details class="peek"${Object.values(pz).some(v => (v || "").trim()) ? " open" : ""}><summary>Stuck? Use P.A.U.S.E. to get there</summary><div class="pause-form" style="margin-top:10px">${A.pause.map(([l, w, qq]) => `<label class="field"><span class="pl"><b>${l}</b>${esc(w)} · <span>${esc(qq)}</span></span><textarea class="v6-ta" rows="1" data-lab-pause="${l}">${esc(pz[l])}</textarea></label>`).join("")}</div></details>
        <label class="field">Your new line 4 <small>Say it out loud first, then write it here.</small><textarea class="v6-ta" rows="3" data-lab-move placeholder="What you’d say instead">${esc(mv)}</textarea></label>
        ${L.compared ? `<div class="compare-2"><div class="bd-p"><small>Your version</small>${q(mv)}</div><div class="bd-p t"><small>How I’d say it</small><span class="tk">${q(A.take)}</span></div></div>
          <div class="coach"><small>Why it works</small>${esc(A.takeWhy)}</div>
          <div class="next-note"><b>One more thing before you go.</b> Look at what happened next in the session.
            <span class="nn-row"><span>${esc(A.line8[0])}</span>${q(A.lines[7][1])}</span>
            <span class="nn-row"><span>${esc(A.line8[1])}</span>${q(A.lines[8][1])}</span>
            When a therapist takes sides, the client often asks them to decide. Next, you’re in the chair for session 3, and that’s exactly where Jordan starts.</div>` : ""}`;
      ok = mv.trim().length >= 8;
    }
    const back = st ? `<button type="button" class="v6-btn secondary" data-lab-nav="-1">← Back</button>` : "<span></span>";
    let fwd;
    if (st < 3) fwd = `<button type="button" class="v6-btn primary" data-lab-nav="1"${ok ? "" : " disabled"}>Next: ${LAB_STEPS[st + 1]} →</button>`;
    else if (!L.compared) fwd = `<button type="button" class="v6-btn primary" data-lab-compare${ok ? "" : " disabled"}>See how I’d say it →</button>`;
    else fwd = S.steps.lab ? `<button type="button" class="v6-btn primary" data-go="week/sim">Next: Jordan’s Advice Request →</button>` : `<button type="button" class="v6-btn primary" data-lab-finish>Finish the Lab ✓</button>`;
    return `<div class="flow">${head}${st === 0 ? `<div class="fiction">Fictional practice scenario. Never enter real client details.</div>` : ""}${body}<div class="actions" style="justify-content:space-between">${back}${fwd}</div></div>`;
  }

  /* ---------- Week 1 Reflect & Redo ---------- */
  const RF_STEPS = ["Your Pull", "Pick a Rep", "Three Checks", "Redo it"];
  function reflectHTML() {
    const F = S.reflect, st = Math.min(F.step || 0, 3);
    const reps = D.REPS.filter(r => r.week === 1 && repSaved(r.id));
    const first = r => { const x = S.reps[r.id]; return (x.attempts[0] && x.attempts[0].move) || x.move || x.line || ""; };
    const r = reps.find(z => z.id === F.rep);
    const head = `<div class="flow-head"><span class="v6-pill blush">${st + 1} of 4 · ${RF_STEPS[st]}</span><div class="flow-dots" aria-hidden="true">${RF_STEPS.map((_, i) => `<span class="${i < st ? "done" : i === st ? "on" : ""}"></span>`).join("")}</div></div>`;
    let body = "", ok = false;
    if (st === 0) {
      body = `<p class="flow-q">${esc(D.REFLECT[0][1])}</p>
        <div class="pull-grid">${D.PULLS.map(([t, d]) => `<button type="button" class="aim" data-rf-pull="${t}" aria-pressed="${F.pullPick === t}"><span>${esc(t)}</span><small>${esc(d)}</small></button>`).join("")}</div>
        ${F.pullPick ? `<label class="field">Where did ${esc(F.pullPick)} show up, and what did you notice first? <small>Optional</small><textarea class="v6-ta" rows="2" data-rf="pull" placeholder="A Rep, the Lab, the Simulation…">${esc(F.pull)}</textarea></label>` : ""}`;
      ok = !!F.pullPick;
    }
    if (st === 1) {
      body = `<p class="flow-q">Pick your weakest Rep.</p><p class="flow-sub">The one you’d most like a do-over on. Here’s your first answer to each.</p>
        ${reps.length ? `<div class="choices">${reps.map(z => `<button type="button" class="choice rf-rep" data-rf-rep="${z.id}" aria-pressed="${F.rep === z.id}"><small>Rep ${z.id} · ${esc(z.client)}</small><span class="cl">${z.line ? q(z.line) : esc(z.stageLine)}</span><span class="mine">You: ${q(first(z))}</span></button>`).join("")}</div>`
          : `<div class="empty">Save at least one Week 1 Rep first. <button type="button" class="v6-link" data-go="rep/1.1">Go to Rep 1.1 →</button></div>`}`;
      ok = !!r;
    }
    if (st === 2 && r) {
      const ck = F.ck || {};
      body = `<p class="flow-q">Run the Three Checks on your first answer.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${r.client[0]}</span><span class="col"><span class="who">${esc(r.client)}</span><span class="said md">${r.line ? q(r.line) : esc(r.stageLine)}</span></span></div>
        <div class="you-said sm"><small>Your first answer</small>${q(first(r))}</div>
        <div class="sort">${D.CHECKS.map(([t, d], i) => `<div class="sort-row"><span class="st"><b>${i + 1}. ${esc(t)}</b><br><small style="color:var(--muted)">${esc(d)}</small></span><span class="sb">${["Yes", "Not quite", "Not sure"].map(v => `<button type="button" class="chip" data-rf-ck="${i}" data-v="${v}" aria-pressed="${ck[i] === v}">${v}</button>`).join("")}</span></div>`).join("")}</div>
        ${D.CHECKS.every((_, i) => ck[i]) ? `<div class="reveal">${D.CHECKS.filter((_, i) => ck[i] !== "Yes").length ? `<b>Your redo target:</b> ${D.CHECKS.map(([t], i) => ck[i] !== "Yes" ? esc(t) : "").filter(Boolean).join(" · ")}` : `<b>All three held up.</b> Redo it anyway and try a different route.`}</div>` : ""}`;
      ok = D.CHECKS.every((_, i) => ck[i]);
    }
    if (st === 3 && r) {
      body = `<p class="flow-q">${esc(D.REFLECT[2][1])} Then name the one thing you changed.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${r.client[0]}</span><span class="col"><span class="who">${esc(r.client)}</span><span class="said md">${r.line ? q(r.line) : esc(r.stageLine)}</span></span></div>
        <label class="field">Your redo<textarea class="v6-ta" rows="3" data-rf="redoLine" placeholder="Say it out loud first, then write it">${esc(F.redoLine)}</textarea></label>
        <label class="field">${esc(D.REFLECT[2][2])}<textarea class="v6-ta" rows="2" data-rf="redo" placeholder="The one thing I changed…">${esc(F.redo)}</textarea></label>
        ${S.steps.reflect ? `<div class="bd-paths"><div class="bd-p"><small>Before</small>${q(first(r))}</div><div class="bd-p t"><small>After</small>${q(F.redoLine)}</div></div>
          ${S.reps[r.id].line === F.redoLine ? `<div class="hint">✓ This is now your Playbook line for Rep ${r.id}.</div>` : `<button type="button" class="v6-link" data-rf-useline>Make this my Playbook line for Rep ${r.id} →</button>`}` : ""}`;
      ok = !!(F.redoLine || "").trim() && !!(F.redo || "").trim();
    }
    const back = st ? `<button type="button" class="v6-btn secondary" data-rf-nav="-1">← Back</button>` : "<span></span>";
    const fwd = st < 3 ? `<button type="button" class="v6-btn primary" data-rf-nav="1"${ok ? "" : " disabled"}>Next: ${RF_STEPS[st + 1]} →</button>`
      : S.steps.reflect ? `<button type="button" class="v6-btn primary" data-go="week/save">Next: Your Profile →</button>` : `<button type="button" class="v6-btn primary" data-rf-save${ok ? "" : " disabled"}>Save my redo ✓</button>`;
    return `<div class="flow">${head}${body}<div class="actions" style="justify-content:space-between">${back}<span style="display:flex;align-items:center;gap:12px"><span class="saved-flag" data-flag></span>${fwd}</span></div></div>`;
  }

  /* ---------- Text simulation player (Week 1: Jordan; Weeks 2-4 reuse it) ---------- */
  const SIMS = window.TCC6_SIMS || {};
  const INTENT_AT = [2, 5]; /* moments 3 and 6: optional pause + "What was your intention?" */
  const shuffle = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const newAttempt = X => ({ i: 0, order: X.moments.map(m => shuffle(m.choices.length)), picks: {}, intent: {}, ref: {}, saved: false, started: Date.now() });
  function simHTML(key = "jordan") {
    const X = SIMS[key], M = S.sim, n = X.moments.length, who = X.client;
    const C = M.cur;
    const fiction = `<div class="fiction">Fictional practice scenario. Never enter real client details.</div>`;
    const hist = M.history || [];
    if (!C) return `<div class="flow">${fiction}<p class="flow-q">${esc(X.title)}</p>
      <div class="sim-skill"><small>What you’re practicing</small>${esc(X.skill)}</div>
      <p class="flow-sub" style="margin:0">${esc(X.setup)}</p>
      <div class="how"><div class="how-h">How this works</div><ol>${[["Read what " + who + " says", ""], ["Pick what you’d say", "There’s no right answer and no score. The order of choices changes each time."], ["See how " + who + " reacts", "Then read what your move was trying to do, and what to watch for."]].map(([t, d], i) => `<li><span class="num lg">${i + 1}</span><span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`).join("")}</ol><div class="how-f">Eight moments, then a short debrief. Take your time.</div></div>
      <div class="actions"><button type="button" class="v6-btn primary" data-sim-start>Start the session →</button></div>
      ${hist.length ? `<div class="hint">You’ve finished ${hist.length} earlier ${hist.length === 1 ? "attempt" : "attempts"}. They’re saved, and your debrief shows what you chose last time.</div>` : ""}</div>`;
    const i = Math.min(C.i, n);
    const head = `<div class="flow-head"><span class="v6-pill blush">${i < n ? `Moment ${i + 1} of ${n}` : "Debrief"}</span><div class="flow-dots sim8" aria-hidden="true">${X.moments.map((_, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}"></span>`).join("")}<span class="${i === n ? "on" : ""}"></span></div></div>`;
    const client = (txt, md) => `<div class="speaker${md ? "" : " boxed"}"><span class="av" aria-hidden="true">${who[0]}</span><span class="col"><span class="who">${esc(who)}</span><span class="said${md ? " md" : ""}">${q(txt)}</span></span></div>`;
    if (i < n) {
      const m = X.moments[i], p = C.picks[i];
      let body = client(m.client);
      if (p == null) {
        body += `<p class="flow-q">What would you say?</p><div class="choices">${C.order[i].map(k => `<button type="button" class="choice" data-sim-pick="${k}"><span>${q(m.choices[k][1])}</span></button>`).join("")}</div>`;
        return `<div class="flow">${head}${body}${i ? `<div class="actions"><button type="button" class="v6-btn secondary" data-sim-go="${i - 1}">← Back</button></div>` : ""}</div>`;
      }
      const c = m.choices[p];
      body += `<div class="you-said"><small>You</small>${q(c[1])}</div>${client(c[2], true)}
        <details class="coach-d" open><summary>Coach note</summary><div class="coach2"><div><small>What this move was trying to do</small>${esc(c[3])}</div><div><small>What to watch for</small>${esc(c[4])}</div></div></details>
        ${INTENT_AT.includes(i) ? `<label class="field intent">Take 20 seconds. What was your intention? <small>Optional, just for you</small><textarea class="v6-ta" rows="2" data-sim-intent="${i}" placeholder="I was trying to…">${esc(C.intent[i])}</textarea></label>` : ""}`;
      return `<div class="flow">${head}${body}<div class="actions" style="justify-content:space-between"><button type="button" class="v6-btn secondary" data-sim-rewind="${i}">↺ Try a different response</button>
        <button type="button" class="v6-btn primary" data-sim-go="${i + 1}">${i === n - 1 ? "Go to the debrief →" : "Continue →"}</button></div></div>`;
    }
    const last = hist[hist.length - 1];
    const rows = X.moments.map((m, k) => { const c = m.choices[C.picks[k]]; if (!c) return ""; const prev = last && last.picks[k] != null && last.picks[k] !== C.picks[k] ? m.choices[last.picks[k]] : null;
      return `<li><span class="mn">${k + 1}</span><span class="mb"><span class="cl">${esc(who)}: ${q(m.client)}</span><span class="me">You: ${q(c[1])}</span><span class="re">${esc(who)}: ${q(c[2])}</span>${prev ? `<span class="pv">Last time you said: ${q(prev[1])}</span>` : ""}</span></li>`; }).join("");
    const R = C.ref, ok = X.debrief.every((_, k) => (R[k] || "").trim());
    return `<div class="flow">${head}<p class="flow-q">Look back at your session.</p>
      <details class="peek"><summary>Your path: all 8 moments</summary><ol class="path">${rows}</ol></details>
      ${X.debrief.map((qq, k) => `<label class="field">${k + 1}. ${esc(qq)}<textarea class="v6-ta" rows="${k === 2 ? 3 : 2}" data-sim-ref="${k}">${esc(R[k])}</textarea></label>`).join("")}
      <div class="actions">${C.saved ? `<button type="button" class="v6-btn primary" data-go="week/reflect">Next: Reflect & Redo →</button><button type="button" class="v6-btn secondary" data-sim-again>Try the session again</button>`
        : `<button type="button" class="v6-btn primary" data-sim-save${ok ? "" : " disabled"}>Save this session</button>`}<span class="saved-flag" data-flag></span></div>
      ${C.saved ? `<div class="hint">Saved to your Clinical Confidence Profile. Trying again starts a new attempt and keeps this one.</div>` : `<div class="hint">Answer all three to save. Your answers go into your Clinical Confidence Profile.</div>`}</div>`;
  }

  function weekView(arg) {
    const sel = Math.max(0, arg ? D.WEEK1.findIndex(s => s.key === arg) : Math.min(curIdx(), D.WEEK1.length - 1));
    const s = D.WEEK1[sel], locked = !unlocked(sel), done = stepDone(s);
    let body = "", cta = "";
    const prev = sel ? D.WEEK1[sel - 1].short : "";

    if (s.type === "day1") {
      const answered = D.BASELINE.filter(b => S.base[b.id] && S.base[b.id].aim).length;
      body = howHTML("What you’ll do today", [
        ["Start with a welcome from me", "What the Lab is, and how it works."],
        ["Answer four client moments", `${D.BASELINE.map(b => b.client).join(", ")} each say something hard to answer. For each one, write what you’d say, then pick what you were going for. No right answers and no feedback today.`]
      ], "Why: these answers are your starting point. In Week 4 you’ll answer the same four moments again and see, side by side, how you’ve grown.");
      if (S.sealed) body += `<div class="done-note">✓ Your four answers are saved in the <b>My growth</b> tab. In Week 4 you’ll compare them with your new answers there.</div>`;
      const watch = S.welcome ? `<button type="button" class="v6-btn secondary" data-act="welcome">Welcome watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="welcome">${D.VIDEOS.welcome ? "I’ve watched the welcome" : "Mark the welcome watched"}</button>`;
      const base = S.sealed ? `<button type="button" class="v6-btn secondary" data-go="growth">See My growth</button>`
        : `<button type="button" class="v6-btn ${S.welcome ? "primary" : "secondary"}" data-go="baseline">${answered ? `Continue the Baseline (${answered} of 4)` : "Start the Baseline"}</button>`;
      cta = watch + base;
    }
    if (s.type === "lesson") {
      const r = REP(s.rep);
      body = howHTML("How this step works", [
        ["Watch the lesson", "One idea, explained with real examples."],
        [`Do Rep ${r.id} with ${r.client}`, "Practice the idea right away: read the moment, write what you’d say, then see how the client reacts and what I’d do."]
      ]) + `<div class="quote-box"><span class="v6-label">Your Rep · ${esc(r.client)}</span><span class="ctx">${esc(r.context)}</span><span class="line">${r.line ? q(r.line) : esc(r.stageLine) + " " + r.silence + " seconds of silence."}</span></div>`;
      if (repSaved(r.id)) body += `<div class="done-note">✓ Rep ${r.id} saved to your Playbook.</div>`;
      cta = (S.watched[s.key] ? `<button type="button" class="v6-btn secondary" data-act="watch" data-key="${s.key}">Lesson watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="watch" data-key="${s.key}">${D.VIDEOS[s.video] ? "I’ve watched the lesson" : "Mark lesson watched"}</button>`)
        + `<button type="button" class="v6-btn ${S.watched[s.key] ? "primary" : "secondary"}" data-go="rep/${r.id}">${repSaved(r.id) ? "Practice it again" : "Do the Rep"}</button>`;
    }
    if (s.type === "demo") {
      body = `<div class="quote-box"><span class="v6-label">${esc(s.quoteLabel)}</span><span class="ctx">${esc(s.context)}</span><span class="line">${esc(s.moment)}</span><span class="pull">${esc(s.pull)}</span></div>`;
      cta = done ? `<button type="button" class="v6-btn secondary" data-act="step" data-key="demo">Demo watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="step" data-key="demo">Mark demo watched</button>`;
    }
    if (s.type === "lab" || s.type === "sim") {
      body = locked ? itemsHTML(s.itemsLabel, s.items) : s.type === "lab" ? labHTML() : simHTML();
      cta = "";
    }
    if (s.type === "reflect") { body = reflectHTML(); cta = ""; }
    if (s.type === "save") {
      const pf = S.profile, M = S.sim, L = S.lab, P = pf.plan = pf.plan || {};
      const g = S.reps["1.1"] && S.reps["1.1"].gap;
      const gp = g && g !== "none" ? D.GAPS.find(x => x[0] === g) : null;
      const SJ = SIMS.jordan, SC = (M.cur && M.cur.saved) ? M.cur : (M.history || []).slice(-1)[0];
      const path = SC && Object.keys(SC.picks).length === 8 ? SJ.moments.map((m, k) => `Moment ${k + 1}: ${(m.choices[SC.picks[k]] || [])[1] || ""}`).join("\n") : "";
      const auto = {
        gap: gp ? `${gp[1]}: ${gp[2].replace(/[“”]/g, "")} (from Rep 1.1)` : "",
        pull: [S.reflect.pullPick, SC && SC.ref[0]].filter(Boolean).join(". "),
        move: L.move || "",
        shift: (SC && SC.ref[1]) || "",
        adjust: (SC && SC.ref[2]) || ""
      };
      const sec = (k, label, hint, ph) => { const v = pf[k] != null ? pf[k] : auto[k]; return `<label class="field">${esc(label)}${hint ? ` <small>${esc(hint)}</small>` : ""}<textarea class="v6-ta" rows="2" data-p="${k}" placeholder="${esc(ph)}">${esc(v)}</textarea></label>`; };
      const lines = D.REPS.filter(r => r.week === 1 && repSaved(r.id) && S.reps[r.id].line.trim());
      body = `<div class="profile">
        <div class="banner-soft">Not a personality test. Filled in from your Week 1 choices. Edit anything.</div>
        <h3 class="pf-h">What I noticed</h3>
        ${sec("gap", "The gap I want to investigate", "A hypothesis, not a diagnosis", "Add the gap you want to look into")}
        ${sec("pull", "My Pull, and the cue I notice first", "", "Add the Pull that grabs you, and what you notice first")}
        ${sec("move", "My grounded first move", "From the Lab", "Add one line you’d actually say")}
        <h3 class="pf-h">My Jordan practice</h3>
        ${path ? `<div class="pf-path">${esc(path).replace(/\n/g, "<br>")}</div>` : `<div class="empty">Your path shows up here after the simulation.</div>`}
        ${sec("shift", "When the priority changed", "", "Add what changed when Jordan shared new information")}
        ${sec("adjust", "My closing for Jordan", "Includes a collaborative safety step, without directing them to stay or leave", "Add your closing")}
        <h3 class="pf-h">“What I Say When…”</h3>
        ${lines.length ? `<div class="bank">${lines.map(r => `<div class="bank-item"><span class="w">${esc(r.bank)}…</span><span class="l">${q(S.reps[r.id].line)}</span></div>`).join("")}</div>` : `<div class="empty">Your lines land here after you save Reps 1.1–1.3.</div>`}
        <h3 class="pf-h">My seven-day practice target</h3>
        <p class="flow-sub" style="margin:0">${esc(D.PLAN.intro)}</p>
        ${D.PLAN.fields.map(([k, label, opts]) => `<div class="field">${esc(label)}${opts ? `<div class="chips-row">${opts.map(o => `<button type="button" class="chip" data-plan="${k}" data-v="${esc(o)}" aria-pressed="${P[k] === o}">${esc(o)}</button>`).join("")}</div>` : ""}
          <input class="v6-in" type="text" data-plan-own="${k}" placeholder="${opts ? "Or write your own" : "Your adjustment"}" value="${esc(opts && opts.includes(P[k]) ? "" : P[k] || "")}"></div>`).join("")}
      </div>`;
      const planOk = !!(P.skill && P.rehearse && P.evidence);
      cta = `<button type="button" class="v6-btn primary" data-act="saveprofile"${planOk ? "" : " disabled"}>${done ? "Profile saved ✓" : "Save my profile"}</button><button type="button" class="v6-btn secondary" data-act="copyprofile">Copy</button><button type="button" class="v6-btn secondary" data-act="printprofile">Print</button><span class="saved-flag" data-flag></span>`;
    }

    const media = ["lab", "sim", "save", "reflect"].includes(s.type) ? "" : video(s.video, s.img, !!s.video);
    const lockedNote = locked ? `<div class="locked-note"><span aria-hidden="true">🔒</span>Opens when you finish ${esc(prev)}.</div>` : "";
    const nxt = D.WEEK1[sel + 1];
    const nextBtn = done && nxt && !["lab", "sim", "reflect"].includes(s.type) ? `<button type="button" class="v6-btn primary" data-go="week/${nxt.key}">Next: ${esc(nxt.short)} →</button>` : "";
    const actions = locked ? `<div class="actions"><button type="button" class="v6-btn primary" disabled>${esc(s.type === "lesson" ? "Watch lesson" : "Locked")}</button></div>` : `<div class="actions">${cta}${nextBtn}</div>`;
    const html = `
      <div class="card stack">${media}
        <div class="pills"><span class="v6-pill blush">Step ${sel + 1} of ${D.WEEK1.length}</span><span class="v6-pill sage">${esc(s.kind)}</span>${/\d/.test(s.meta) ? `<span class="v6-pill neutral">${esc(s.meta)}</span>` : ""}${done ? `<span class="v6-pill sage">Done ✓</span>` : ""}</div>
        <div><h2 class="detail-title">${esc(s.title)}</h2><p class="detail-desc">${esc(s.desc)}</p></div>
        ${locked && (s.type === "reflect" || s.type === "save") ? "" : body}${lockedNote}${actions}
      </div>
`;
    const w = D.WEEKS[0];
    const hero = `<section class="week-hero"><div class="in">
      <div class="v6-label">Week 1 of 4 · ${esc(w.theme)}</div>
      <h1>${accent(w.title)}<em>.</em></h1>
      <p>${esc(w.question)} <span>· ${doneCount()} of ${D.WEEK1.length} steps done</span></p></div>
      </section>`;
    return { html, sel, hero };
  }

  /* ---------- Rep ---------- */
  let silenceTimer = null;
  function repView(id) {
    const r = REP(id) || REP("1.1");
    if (!weekOpen(r.week)) return { html: `<div class="card stack-12"><div class="locked-note"><span aria-hidden="true">🔒</span>Rep ${r.id} opens in Week ${r.week}.</div><div><button type="button" class="v6-btn secondary" data-go="reproom">Back to the Rep Room</button></div></div>`, title: `Rep ${r.id}`, crumb: ["Rep Room", `Rep ${r.id}`, "reproom"], rail: repRailHTML(1, false) };
    if (r.pending) return { html: `<div class="card stack-12"><span class="v6-pill blush" style="align-self:flex-start">1 · The moment</span><div class="speaker boxed"><span class="av">${r.client[0]}</span><span class="col"><span class="who">${esc(r.client)}, ${r.age}</span><span class="said md">${esc(r.moment)}</span></span></div>
      <div class="soon-note">This Rep is still being written. Its reactions and Tiffany’s take arrive with Week ${r.week}.</div></div>`, title: `Rep ${r.id} · ${r.client}`, crumb: ["Rep Room", `Rep ${r.id}`, "reproom"], rail: repRailHTML(1, false) };

    const x = R(r.id), name = r.client;
    const aims = D.AIMS.concat(r.extraAim ? [r.extraAim] : []);
    const canAim = (x.move || "").trim().length >= 3;
    const react = x.aim ? r.reactions[x.aim] : null;
    const reacts = react ? [].concat(react) : [];
    const beat2 = reacts.some(z => z.beat2);
    const stage = x.saved ? 6 : x.aim ? 5 : canAim ? 3 : 2;
    const week1Steps = D.WEEK1.filter(s => s.type === "lesson");
    const li = week1Steps.findIndex(s => s.rep === r.id);
    let nextLine = "";
    if (r.week === 1) nextLine = li < 2 ? `Next: Lesson ${li + 2} and Rep ${week1Steps[li + 1].rep} with ${REP(week1Steps[li + 1].rep).client}.` : "Next: the Demo with Jordan.";
    else { const n = D.REPS.find(z => z.week === r.week && z.id > r.id && !z.pending); nextLine = n ? `Next: Rep ${n.id} with ${n.client}.` : "Back to the Rep Room for more."; }

    const moment = r.line
      ? `<div class="speaker boxed"><span class="av" aria-hidden="true">${name[0]}</span><span class="col"><span class="who">${esc(name)}</span><span class="said">${q(r.line)}</span></span></div>`
      : `<div class="speaker boxed"><span class="av" aria-hidden="true">${name[0]}</span><span class="col"><span class="who">${esc(name)}</span><span class="stage">${esc(r.stageLine)}</span>
          <span class="silence" aria-live="off"><span class="bar"><i data-silence style="width:0%"></i></span><span data-silence-t>0 of ${r.silence} seconds of silence</span></span></span></div>`;
    const map = r.extra === "miniMap" ? `<div class="stack-12" style="display:flex;flex-direction:column;gap:10px"><span class="v6-label">Before your move · Map it</span>
      <div class="minimap">${[["fact", "One fact", "What she actually said"], ["thread", "One possible thread", "A pattern, offered as a question"], ["q", "One question to test it", "What would you ask?"]].map(([k, a, p]) => `<label class="field">${a}<textarea rows="3" data-map="${k}" placeholder="${p}">${esc(x.map[k])}</textarea></label>`).join("")}</div></div>` : "";

    let html = `<div class="card stack">
      <div class="rep-top"><span class="v6-pill blush">1 · The moment</span><span class="lesson">Lesson ${r.id.split(".")[1]} · ${esc(r.lesson)}</span></div>
      <div class="rep-ctx">${esc(r.context)}</div>${moment}${map}
      <label class="field" style="gap:8px"><span class="step-head"><span class="v6-label">2 · Your move</span><span class="opt">Type it the way you’d say it</span></span>
        <textarea class="v6-ta" rows="3" data-move placeholder="What would you say next? Say it the way you’d actually say it.">${esc(x.move)}</textarea></label>
      <div style="display:flex;flex-direction:column;gap:10px"><span class="v6-label">3 · Name your aim · What were you going for?</span>
        <div class="aims">${aims.map(([k, n, label]) => `<button type="button" class="aim" data-aim="${k}" aria-pressed="${x.aim === k}"${canAim ? "" : " disabled"}><span>${esc(label)}</span><small>${esc(n)}</small></button>`).join("")}</div>
        <span class="hint" data-aim-hint${canAim ? " hidden" : ""}>Write your move first. Then name what you were going for.</span></div>
    </div>`;

    if (x.aim) {
      html += `<div class="card stack-12"><span class="v6-label">4 · ${esc(name)} reacts</span>${reacts.length ? reacts.map(z => `<div class="reaction-alt">${z.move ? `<p class="move-label" style="margin:0 0 8px">${reacts.length > 1 ? "If your move sounded like" : "A move like"} <b>${esc(z.move)}</b></p>` : ""}
        <div class="speaker"><span class="av" aria-hidden="true">${name[0]}</span><span class="col">${z.stage ? `<span class="stage">${esc(z.stage)}</span>` : ""}<span class="said md">${q(z.says)}</span>${z.after ? `<span class="stage">${esc(z.after)}</span>` : ""}<span class="shows">${esc(z.shows)}</span></span></div></div>`).join("")
        : `<div style="font-size:15px;color:var(--ink-2)">Let’s see what Tiffany would do with this.</div>`}
        ${beat2 ? `<label class="field" style="margin-top:8px;padding-top:14px;border-top:1px solid var(--line-2)"><span class="v6-label">Keep going · ${esc(r.beat2.prompt)}</span>${r.beat2.note ? `<small>${esc(r.beat2.note)}</small>` : ""}<textarea class="v6-ta" rows="2" data-beat2 placeholder="Your next move, in your own words">${esc(x.beat2)}</textarea></label>` : ""}
      </div>
      <div class="card sage stack-12 take"><div class="speaker" style="align-items:center;gap:10px"><span class="av t" aria-hidden="true">T</span><span class="col" style="gap:0"><span class="v6-label forest">5 · Tiffany’s take</span><span style="font-size:12.5px;color:var(--ink-2)">One good option, never “the answer”</span></span></div>
        <div class="pull"><b>The Pull: ${esc(r.take.pull)}.</b> ${esc(r.take.text)}</div>
        <div class="say"><small>${esc(r.take.sayLabel || "One way to say it")}</small><div>${q(r.take.say)}</div></div>
        ${r.take.beat2Say ? `<div class="say"><small>For Beat 2, try</small><div>${q(r.take.beat2Say)}</div></div>` : ""}
        <div class="why">${r.take.why ? esc(r.take.why) + " " : ""}<b>Watch for</b> ${esc(r.take.watch)}</div>
      </div>`;
      if (r.extra === "gap") html += `<div class="card stack-12"><span class="v6-label">Extra step · Which gap showed up for you?</span>
        <div class="aims">${D.GAPS.map(([k, label, hint]) => `<button type="button" class="aim" data-gap="${k}" aria-pressed="${x.gap === k}"><span>${esc(label)}</span><small>${esc(hint)}</small></button>`).join("")}</div>
        <button type="button" class="aim none" data-gap="none" aria-pressed="${x.gap === "none"}"><span>None of these showed up for me</span><small>That’s useful to know too</small></button>
        <span class="hint">${x.gap === "none" ? "Got it. You can come back and pick one if something clicks later." : "Your answer pre-fills your Clinical Confidence Profile."}</span></div>`;
      html += `<div class="card stack-12"><span class="v6-label">6 · Run it back</span><div style="font-size:14px;color:var(--ink-2)">Want another go? Try it again and test it with the Three Checks. Then write the line you’d want to remember next time this happens.</div>
        ${x.attempts.length ? `<div class="attempts">${x.attempts.map((a, i) => `<div><small>Try ${i + 1}</small>${q(a.move)}${a.aim ? ` · ${esc((aims.find(z => z[0] === a.aim) || [])[1] || "")}` : ""}</div>`).join("")}</div>` : ""}
        <label class="field">Your line to keep <small>${esc(r.bank)}…</small><textarea class="v6-ta" rows="2" data-line placeholder="Your best line, in your own words">${esc(x.line)}</textarea></label>
        ${x.saved ? `<div class="saved-box"><span><b>✓ Saved</b> to your Playbook. ${esc(nextLine)}</span><button type="button" class="v6-link" data-go="playbook">Open Playbook →</button></div>
          <div class="actions"><button type="button" class="v6-btn secondary" data-act="again">↺ Try again</button>${r.week === 1 ? `<button type="button" class="v6-btn secondary" data-go="week/${D.WEEK1[D.WEEK1.findIndex(s => s.rep === r.id) + 1].key}">Continue Week 1 →</button>` : ""}</div>`
        : `<div class="actions"><button type="button" class="v6-btn secondary" data-act="again">↺ Try again</button><button type="button" class="v6-btn primary" data-act="saveline"${(x.line || "").trim() ? "" : " disabled"}>Save to “What I Say When…”</button></div>`}
      </div>`;
    }
    const crumb = r.week === 1 ? ["Week 1", `Rep ${r.id}`, "week/" + D.WEEK1.find(s => s.rep === r.id).key] : ["Rep Room", `Rep ${r.id}`, "reproom"];
    return {
      html, tight: true, title: `Rep ${r.id} · ${r.title}`, plain: true, sub: `Your practice for Lesson ${r.id.split(".")[1]}: ${r.lesson}. Unlike Day 1, you’ll see how ${r.client} reacts, get my take, and then try it again.`, crumb, rail: repRailHTML(stage, x.saved),
      after: () => {
        clearInterval(silenceTimer);
        if (!r.silence) return;
        const bar = $("[data-silence]"), t = $("[data-silence-t]");
        if (!bar) return;
        if (x.aim) { bar.style.width = "100%"; t.textContent = `${r.silence} seconds of silence`; return; }
        let s = 0;
        silenceTimer = setInterval(() => { s++; if (!document.body.contains(bar)) return clearInterval(silenceTimer); bar.style.width = Math.min(100, s / r.silence * 100) + "%"; t.textContent = `${Math.min(s, r.silence)} of ${r.silence} seconds of silence`; if (s >= r.silence) clearInterval(silenceTimer); }, 1000);
      }
    };
  }

  /* ---------- Day 1 Baseline ---------- */
  function baselineView() {
    const crumb = ["Week 1", "Day 1 Baseline", "week/day1"];
    if (S.sealed) return { crumb, html: `<div class="card stack-12"><div class="sealed"><span aria-hidden="true">✓</span><span><b>Saved.</b> Your four answers now live in the <b>My growth</b> tab. In Week 4 you’ll answer the same moments again, and both answers will show up there side by side.</span></div>
      <div class="actions"><button type="button" class="v6-btn primary" data-go="week/l1">Start Lesson 1</button><button type="button" class="v6-btn secondary" data-go="growth">See My growth</button></div></div>` };
    const i = Math.min(S.baseIdx || 0, 3), b = D.BASELINE[i], a = S.base[b.id] || { move: "", aim: null };
    const canAim = (a.move || "").trim().length >= 3;
    const html = `<div class="card stack">
      <div class="rep-top"><span class="v6-pill blush">Moment ${i + 1} of 4</span><span class="lesson">No feedback today</span></div>
      <div class="baseline-steps" aria-hidden="true">${D.BASELINE.map((z, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}"></span>`).join("")}</div>
      <div class="rep-ctx">${esc(b.context)}</div>
      <div class="speaker boxed"><span class="av" aria-hidden="true">${b.client[0]}</span><span class="col"><span class="who">${esc(b.client)}</span><span class="said">${q(b.line)}</span></span></div>
      <label class="field" style="gap:8px"><span class="v6-label">Your move</span><small>${esc(D.BASELINE_PROMPT)}</small>
        <textarea class="v6-ta" rows="3" data-bmove placeholder="What would you say next?">${esc(a.move)}</textarea></label>
      <div style="display:flex;flex-direction:column;gap:10px"><span class="v6-label">Your aim · What were you going for?</span>
        <div class="aims">${D.AIMS.map(([k, n, label]) => `<button type="button" class="aim" data-baim="${k}" aria-pressed="${a.aim === k}"${canAim ? "" : " disabled"}><span>${esc(label)}</span><small>${esc(n)}</small></button>`).join("")}</div>
        <span class="hint" data-aim-hint${canAim ? " hidden" : ""}>Write your move first. Then name what you were going for.</span></div>
      <div class="actions" style="justify-content:space-between">${i ? `<button type="button" class="v6-btn secondary" data-act="bprev">← Back</button>` : "<span></span>"}
        <button type="button" class="v6-btn primary" data-act="bnext"${a.aim && canAim ? "" : " disabled"}>${i === 3 ? "Save and seal my answers" : "Next moment →"}</button></div>
    </div>`;
    return { html, crumb };
  }

  /* ---------- Rep Room ---------- */
  let chip = "open";
  function roomView() {
    const all = D.REPS.map(r => {
      const open = weekOpen(r.week), x = S.reps[r.id], practiced = !!(x && x.saved);
      return { r, open, practiced, n: x ? x.attempts.length + (x.saved ? 1 : 0) : 0 };
    });
    const list = all.filter(c => chip === "all" || (chip === "done" ? c.practiced : c.open));
    const html = `<div class="chips-row">${[["open", "Open now"], ["done", "Practiced"], ["all", "All 12 Reps"]].map(([k, l]) => `<button type="button" class="chip" data-chip="${k}" aria-pressed="${chip === k}">${l}</button>`).join("")}</div>
      ${list.length ? `<div class="room-grid">${list.map(({ r, open, practiced, n }) => {
        const tag = practiced ? `<span class="v6-pill sage">Practiced ${n}×</span>` : open ? (r.pending ? `<span class="v6-pill muted">Being written</span>` : `<span class="v6-pill blush">Open</span>`) : `<span class="v6-pill muted">Opens Week ${r.week}</span>`;
        const btn = open ? `<button type="button" class="v6-btn secondary small" data-go="rep/${r.id}">${r.pending ? "Preview the moment" : practiced ? "Practice again" : "Start Rep"}</button>` : `<button type="button" class="v6-btn secondary small" disabled>Locked</button>`;
        return `<div class="room-card${open ? "" : " locked"}"><div class="top"><span>Rep ${r.id} · ${esc(r.client)}</span>${tag}</div>
          <div class="m">${r.pending ? esc(r.moment) : r.roomMoment ? esc(r.roomMoment) : r.line ? q(r.line) : esc(r.stageLine) + " " + r.silence + " seconds of silence."}</div>
          <div class="meta">Week ${r.week} · ${esc(r.theme)} · ${esc(r.lesson)}</div><div class="go">${btn}</div></div>`;
      }).join("")}</div>` : `<div class="empty">Reps you save show up here. Start with Rep 1.1.</div>`}
      <div class="bonus"><span class="t">Bonus Reps<small>${esc(D.BONUS)}</small></span><span class="v6-pill white">Coming soon</span></div>`;
    return { html, tight: true };
  }

  /* ---------- Playbook ---------- */
  function playbookView() {
    const lines = bankLines();
    const html = `<div class="card">
        <div class="between" style="margin-bottom:6px"><h2 class="pb-title">What I Say When…</h2><span style="font-size:13px;font-weight:600;color:var(--forest)">${lines.length} of 12+ lines</span></div>
        <p class="note" style="margin:0 0 16px;font-size:14px">Your best line from every Rep, in your own words. Three new lines each week.</p>
        ${lines.length ? `<div class="bank">${lines.map(r => `<div class="bank-item"><span class="w">${esc(r.bank)}…</span><span class="l">${q(S.reps[r.id].line)}</span><span class="f">Rep ${r.id} · ${esc(r.client)}<button type="button" data-go="rep/${r.id}">Edit</button></span></div>`).join("")}</div>`
          : `<div class="empty">Your first line lands here after the Lesson 1 Rep.</div>`}
      </div>
      <div class="card"><h2 class="h">Your tools</h2><div class="grid2">
        <div class="words"><span class="t">The Pull</span><span class="d">The automatic urge that grabs you under pressure.</span><div class="chips">${D.PULLS.map(([t, d]) => `<span title="${esc(d)}">${esc(t)}</span>`).join("")}</div></div>
        <div class="words"><span class="t">P.A.U.S.E.</span><span class="d">Your way back in when you go blank.</span><div class="pause">${D.PAUSE.map(([l, t]) => `<span><b>${l}</b> · ${esc(t)}</span>`).join("")}</div></div>
      </div></div>
      <div class="card flush"><div style="padding:20px 24px 12px"><h2 class="h" style="margin:0">What you’ll walk away with</h2></div>
        ${D.DELIVERABLES.map(([n, t, sub], i) => {
          const cur = i === 0, status = cur ? (S.steps.save ? "Saved" : anyProgress() ? "In progress" : "This week") : `Week ${n}`;
          const pill = cur ? (S.steps.save ? "sage" : "blush") : "muted";
          return `<div class="del${cur ? " cur" : ""}"><span class="n">${n}</span><span class="tt">${esc(t)}<small>${esc(sub)}</small></span>${cur ? `<button type="button" class="v6-link" style="font-size:13px" data-go="week/save">Open</button>` : ""}<span class="v6-pill ${pill}">${status}</span></div>`;
        }).join("")}
      </div>`;
    return { html };
  }

  /* ---------- My growth ---------- */
  function growthView() {
    const html = D.BASELINE.map(b => {
      const a = S.base[b.id];
      const day1 = S.sealed ? `<span class="slot ok"><span class="lbl">Day 1 · your words</span>✓ Saved. Your Week 4 answer will appear next to it.</span>`
        : a && a.aim ? `<span class="slot"><span class="lbl">Day 1 · your words</span>Answered. Finish Day 1 to seal it.</span>`
        : `<span class="slot" style="color:var(--muted)"><span class="lbl">Day 1 · your words</span>Not answered yet. You’ll answer this on Day 1.</span>`;
      return `<div class="card stack-12" style="gap:14px"><div class="growth-top"><span class="col"><span class="who">${esc(b.who)}</span><span class="line">${q(b.line)}</span></span><span class="v6-pill sage">${b.id} · ${esc(b.skill)}</span></div>
        <div class="grid2">${day1}<span class="slot dash"><span class="lbl">Week 4 · your words</span>Opens in Week 4</span></div></div>`;
    }).join("");
    return { html, tight: true };
  }

  /* ---------- Events ---------- */
  function flash(msg) { const f = $("[data-flag]"); if (f) { f.textContent = msg; setTimeout(() => { if (f) f.textContent = ""; }, 1800); } }
  function bind(scr, arg) {
    const app = $("[data-app]");
    $$("[data-go]", app).forEach(b => b.onclick = () => go(b.dataset.go));
    $$("[data-sb-sec]", app).forEach(b => b.onclick = () => { const k = b.dataset.sbSec; SB.closed[k] = !SB.closed[k]; sbSave(); const open = !SB.closed[k]; b.setAttribute("aria-expanded", open); b.querySelector("i").textContent = open ? "−" : "+"; b.nextElementSibling.hidden = !open; });
    if (scr === "week") {
      $$("[data-act]", app).forEach(b => b.onclick = () => {
        const k = b.dataset.key, act = b.dataset.act;
        if (act === "welcome") { S.welcome = !S.welcome; }
        if (act === "watch") { S.watched[k] = !S.watched[k]; }
        if (act === "saveprofile") { $$("[data-p]", app).forEach(t => S.profile[t.dataset.p] = t.value); S.steps.save = true; save(); render(); flash("Saved"); return; }
        if (act === "copyprofile" || act === "printprofile") {
          const txt = $$(".profile .field, .profile .pf-h, .profile .pf-path", app).map(el => el.matches(".pf-h") ? "\n" + el.textContent.toUpperCase() : el.matches(".pf-path") ? el.innerText : (el.querySelector("textarea, input") ? `${el.firstChild.textContent.trim()}: ${(el.querySelector("[aria-pressed=true]") || {}).textContent || el.querySelector("textarea, input").value || "—"}` : "")).join("\n");
          if (act === "copyprofile") { (navigator.clipboard ? navigator.clipboard.writeText("My Clinical Confidence Profile\n" + txt) : Promise.reject()).then(() => flash("Copied"), () => flash("Couldn’t copy")); }
          else window.print();
          return;
        }
        if (act === "step") {
          if (k === "reflect" || k === "save") { S.steps[k] = true; save(); render(); flash("Saved"); return; }
          S.steps[k] = !S.steps[k];
        }
        save(); render();
      });
      $$("[data-r]", app).forEach(t => t.oninput = t.onchange = () => { S.reflect[t.dataset.r] = t.value; save(); });
      $$("[data-pullchip]", app).forEach(b => b.onclick = () => { S.reflect.pullPick = b.dataset.pullchip; save(); $$("[data-pullchip]", app).forEach(c => c.setAttribute("aria-pressed", c === b)); });
      $$("[data-p]", app).forEach(t => t.oninput = () => { S.profile[t.dataset.p] = t.value; save(); });
      /* Lab */
      const L = S.lab, top = () => { const f = $(".flow", app); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" }); };
      $$("[data-lab-turn]", app).forEach(b => b.onclick = () => { L.turnPick = +b.dataset.labTurn; save(); render(); });
      $$("[data-lab-sort]", app).forEach(b => b.onclick = () => { L.sort = L.sort || {}; L.sort[b.dataset.labSort] = b.dataset.v; save(); render(); });
      [["p4", "labP4"], ["p8", "labP8"], ["gap", "labGap"]].forEach(([k, d]) => $$(`[data-lab-${k}]`, app).forEach(b => b.onclick = () => { L[k] = b.dataset[d]; save(); render(); }));
      $$("[data-lab-pause]", app).forEach(t => t.oninput = () => { L.pause = L.pause || {}; L.pause[t.dataset.labPause] = t.value; save(); const n = $('[data-lab-nav="1"]', app); if (n) n.disabled = !(L.pause.S || "").trim(); });
      const lm = $("[data-lab-move]", app); if (lm) lm.oninput = () => { L.move = lm.value; save(); const c = $("[data-lab-compare]", app); if (c) c.disabled = lm.value.trim().length < 8; };
      $$("[data-lab-nav]", app).forEach(b => b.onclick = () => { L.step = Math.max(0, Math.min(3, (L.step || 0) + +b.dataset.labNav)); save(); render(); top(); });
      const lc = $("[data-lab-compare]", app); if (lc) lc.onclick = () => { L.compared = true; save(); render(); };
      const lf = $("[data-lab-finish]", app); if (lf) lf.onclick = () => { S.steps.lab = true; save(); render(); };
      /* Reflect & Redo */
      const F = S.reflect;
      $$("[data-rf-pull]", app).forEach(b => b.onclick = () => { F.pullPick = b.dataset.rfPull; save(); render(); });
      $$("[data-rf-rep]", app).forEach(b => b.onclick = () => { if (F.rep !== b.dataset.rfRep) { F.rep = b.dataset.rfRep; F.ck = {}; } save(); render(); });
      $$("[data-rf-ck]", app).forEach(b => b.onclick = () => { F.ck = F.ck || {}; F.ck[b.dataset.rfCk] = b.dataset.v; save(); render(); });
      $$("[data-rf]", app).forEach(t => t.oninput = () => { F[t.dataset.rf] = t.value; save(); const sv = $("[data-rf-save]", app); if (sv) sv.disabled = !((F.redoLine || "").trim() && (F.redo || "").trim()); });
      $$("[data-rf-nav]", app).forEach(b => b.onclick = () => { F.step = Math.max(0, Math.min(3, (F.step || 0) + +b.dataset.rfNav)); save(); render(); top(); });
      const rfs = $("[data-rf-save]", app); if (rfs) rfs.onclick = () => { S.steps.reflect = true; save(); render(); flash("Saved"); };
      const rfu = $("[data-rf-useline]", app); if (rfu) rfu.onclick = () => { const x = S.reps[F.rep]; if (x) { x.line = F.redoLine; x.saved = true; } save(); render(); flash("Playbook updated"); };
      /* Simulation */
      const M = S.sim, X = SIMS.jordan, C = M.cur;
      const ss = $("[data-sim-start]", app); if (ss) ss.onclick = () => { M.cur = newAttempt(X); save(); render(); top(); };
      $$("[data-sim-pick]", app).forEach(b => b.onclick = () => { C.picks[C.i] = +b.dataset.simPick; save(); render(); });
      $$("[data-sim-go]", app).forEach(b => b.onclick = () => { C.i = +b.dataset.simGo; save(); render(); top(); });
      $$("[data-sim-rewind]", app).forEach(b => b.onclick = () => { const k = +b.dataset.simRewind; delete C.picks[k]; C.i = k; save(); render(); });
      $$("[data-sim-intent]", app).forEach(t => t.oninput = () => { C.intent[t.dataset.simIntent] = t.value; save(); });
      $$("[data-sim-ref]", app).forEach(t => t.oninput = () => { C.ref[t.dataset.simRef] = t.value; save(); const sv = $("[data-sim-save]", app); if (sv) sv.disabled = !X.debrief.every((_, k) => (C.ref[k] || "").trim()); });
      const ssv = $("[data-sim-save]", app); if (ssv) ssv.onclick = () => { C.saved = true; C.done = Date.now(); S.steps.sim = true; delete S.profile.shift; delete S.profile.adjust; save(); render(); flash("Saved"); };
      const sag = $("[data-sim-again]", app); if (sag) sag.onclick = () => { M.history = M.history || []; M.history.push(C); M.cur = newAttempt(X); save(); render(); top(); };
      /* Profile */
      $$("[data-plan]", app).forEach(b => b.onclick = () => { const P = S.profile.plan = S.profile.plan || {}; P[b.dataset.plan] = b.dataset.v; save(); render(); });
      $$("[data-plan-own]", app).forEach(t => t.oninput = () => { const P = S.profile.plan = S.profile.plan || {}; P[t.dataset.planOwn] = t.value; save(); $$(`[data-plan="${t.dataset.planOwn}"]`, app).forEach(c => c.setAttribute("aria-pressed", "false")); const sv = $('[data-act="saveprofile"]', app); if (sv) sv.disabled = !(P.skill && P.rehearse && P.evidence); });
    }
    if (scr === "rep") {
      const r = REP(arg) || REP("1.1"); if (r.pending || !weekOpen(r.week)) return;
      const x = R(r.id);
      const move = $("[data-move]", app);
      if (move) move.oninput = () => {
        x.move = move.value; save();
        const ok = x.move.trim().length >= 3;
        $$("[data-aim]", app).forEach(b => b.disabled = !ok);
        const h = $("[data-aim-hint]", app); if (h) h.hidden = ok;
      };
      $$("[data-map]", app).forEach(t => t.oninput = () => { x.map[t.dataset.map] = t.value; save(); });
      $$("[data-aim]", app).forEach(b => b.onclick = () => {
        const first = !x.aim; x.aim = b.dataset.aim; save(); render();
        if (first) { const c = $$(".v6-col .card", app)[1]; if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
      const b2 = $("[data-beat2]", app); if (b2) b2.oninput = () => { x.beat2 = b2.value; save(); };
      $$("[data-gap]", app).forEach(b => b.onclick = () => { x.gap = b.dataset.gap; delete S.profile.gap; save(); render(); });
      const line = $("[data-line]", app);
      if (line) line.oninput = () => { x.line = line.value; save(); const s = $('[data-act="saveline"]', app); if (s) s.disabled = !x.line.trim(); };
      $$("[data-act]", app).forEach(b => b.onclick = () => {
        if (b.dataset.act === "saveline") { if (!x.line.trim()) return; x.saved = true; save(); render(); }
        if (b.dataset.act === "again") { if (x.move.trim()) x.attempts.push({ move: x.move, aim: x.aim }); x.move = ""; x.aim = null; x.beat2 = ""; save(); render(); scrollTo({ top: 0, behavior: "smooth" }); const m = $("[data-move]"); if (m) m.focus({ preventScroll: true }); }
      });
    }
    if (scr === "baseline") {
      const i = Math.min(S.baseIdx || 0, 3), b = D.BASELINE[i];
      const a = S.base[b.id] = S.base[b.id] || { move: "", aim: null };
      const move = $("[data-bmove]", app);
      const sync = () => { const ok = (a.move || "").trim().length >= 3; $$("[data-baim]", app).forEach(z => z.disabled = !ok); const h = $("[data-aim-hint]", app); if (h) h.hidden = ok; const n = $('[data-act="bnext"]', app); if (n) n.disabled = !(ok && a.aim); };
      if (move) move.oninput = () => { a.move = move.value; save(); sync(); };
      $$("[data-baim]", app).forEach(z => z.onclick = () => { a.aim = z.dataset.baim; save(); $$("[data-baim]", app).forEach(y => y.setAttribute("aria-pressed", y === z)); sync(); });
      $$("[data-act]", app).forEach(z => z.onclick = () => {
        if (z.dataset.act === "bprev") S.baseIdx = Math.max(0, i - 1);
        if (z.dataset.act === "bnext") { if (i === 3) S.sealed = true; else S.baseIdx = i + 1; }
        save(); render(); scrollTo({ top: 0 });
      });
    }
    if (scr === "reproom") $$("[data-chip]", app).forEach(b => b.onclick = () => { chip = b.dataset.chip; render(); });
  }

  /* Global controls */
  $("[data-login-form]").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim().toLowerCase(), pw = f.password.value;
    const err = $("[data-login-error]");
    if (email === PREVIEW_EMAIL && pw === PREVIEW_PASSWORD) { sessionStorage.setItem(PREVIEW_SESSION, "1"); err.textContent = ""; f.reset(); render(); }
    else err.textContent = "That email and password don’t match the preview account.";
  });
  $("[data-sb-min]").onclick = () => { SB.min = !SB.min; sbSave(); render(); };
  $$("[data-signout]").forEach(b => b.onclick = () => { sessionStorage.removeItem(PREVIEW_SESSION); render(); });
  $$("[data-preview-toggle]").forEach(b => b.onclick = () => { S.reviewer = !S.reviewer; save(); render(); });
  /* Preview only: wipe this browser's progress and start over */
  $$("[data-reset]").forEach(b => b.onclick = () => {
    if (!confirm("Erase all your answers and progress in this browser and start over?")) return;
    S = blank(); save(); go("home");
  });
  addEventListener("hashchange", render);
  render();
})();
