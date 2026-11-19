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

  const KEY = "tcc-v6-v2";
  const blank = () => ({ welcome: false, base: {}, baseIdx: 0, sealed: false, watched: {}, reps: {}, steps: {}, reflect: {}, profile: {}, lab: {}, sim: { v: 3 }, act: {}, demo: {}, reviewer: false });
  let S = blank();
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage unavailable */ }
  if (!S.sim || S.sim.v !== 3) S.sim = { v: 3 };
  if (S.actV !== 2) { S.act = {}; S.actV = 2; } /* activities rewritten (harder versions): start them fresh */ /* simulation content changed (8-moment text simulations): start it fresh */
  const save = () => { if (!S.start && anyProgress()) S.start = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };

  const REP = id => D.REPS.find(r => r.id === id);
  const R = id => (S.reps[id] = S.reps[id] || { move: "", aim: null, map: {}, gap: null, beat2: "", line: "", saved: false, attempts: [] });
  const repSaved = id => !!(S.reps[id] && S.reps[id].saved);
  /* Lesson activities (lab-v6-acts.js): state per activity = { i: screen, v: answers, done } */
  const ACTS = window.TCC6_ACTS || {};
  const ACT = k => { S.act = S.act || {}; return (S.act[k] = S.act[k] || { i: 0, v: {}, done: false }); };
  const actDone = k => !!(S.act && S.act[k] && S.act[k].done);
  const actV = k => (S.act && S.act[k] && S.act[k].v) || {};

  /* Week 1 progress */
  const stepDone = s => {
    if (s.type === "day1") return S.welcome && S.sealed;
    if (s.type === "lesson") return !!S.watched[s.key] && actDone(s.key);
    return !!S.steps[s.key];
  };
  const doneCount = () => D.WEEK1.filter(stepDone).length;
  const curIdx = () => { const i = D.WEEK1.findIndex(s => !stepDone(s)); return i === -1 ? D.WEEK1.length : i; };
  const unlocked = i => S.reviewer || i <= curIdx();
  /* Drip: a week opens only when the week before is finished AND its date has arrived (7 days apart, counted from the day the student starts). */
  const DRIP_DAYS = 7;
  const weekDone = n => n === 1 ? curIdx() >= D.WEEK1.length : false; /* Weeks 2-4 not built yet */
  const opensAt = n => S.start ? S.start + (n - 1) * DRIP_DAYS * 864e5 : null;
  const timeReached = n => n === 1 || (S.start && Date.now() >= opensAt(n));
  const weekOpen = n => n === 1 || S.reviewer || (weekDone(n - 1) && timeReached(n));
  const fmtDay = (t, long) => new Date(t).toLocaleDateString("en-US", long ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });
  const weekStatus = n => {
    if (weekOpen(n)) return S.reviewer && !(weekDone(n - 1) && timeReached(n)) ? "Preview open" : "Open now";
    if (!S.start) return `Opens ${(n - 1) * DRIP_DAYS} days after you start`;
    const when = timeReached(n) ? "" : `Opens ${fmtDay(opensAt(n), true)}`;
    if (weekDone(n - 1)) return when;
    return when ? `${when} · finish Week ${n - 1} first` : `Finish Week ${n - 1} to open`;
  };
  const lessonReps = () => D.REPS.filter(r => !r.pending);
  const bankLines = () => lessonReps().filter(r => repSaved(r.id) && (S.reps[r.id].line || "").trim());
  const repsCompleted = () => lessonReps().filter(r => repSaved(r.id)).length + (S.sealed ? 4 : 0);
  const anyProgress = () => doneCount() > 0 || S.welcome || Object.keys(S.base).length > 0 || Object.keys(S.reps).length > 0 || Object.keys(S.act || {}).length > 0;

  /* Routing: #home · #week/<step> · #rep/<id> · #baseline · #reproom · #playbook · #growth */
  const route = () => { const [scr, arg] = (location.hash.slice(1) || "home").split("/"); return { scr: D.HEADS[scr] ? scr : "home", arg: arg ? decodeURIComponent(arg) : null }; };
  const go = h => { if (location.hash === "#" + h) render(); else location.hash = h; };
  let lastScr = null;

  const NAV = [["home", "Home", "Home"], ["week", "My week", "Week"], ["reproom", "Rep Room", "Reps"], ["playbook", "Playbook", "Playbook"], ["growth", "My growth", "Growth"]];

  /* Back button: walks back through screens visited in this tab; falls back to Home. */
  const trail = [];
  let goingBack = false;
  const goBack = () => { trail.pop(); const prev = trail[trail.length - 1] || "home"; goingBack = true; go(prev); };
  const setMenu = open => { $(".v6-app").classList.toggle("menu-open", open); $$("[data-menu]").forEach(b => b.setAttribute("aria-expanded", open)); };

  /* ---------- Behind-the-scenes attempt log (Airtable "Lab Attempts") ----------
     One row per activity attempt. A value is locked as the FIRST answer the first time it is committed
     (a choice tapped, or a screen left / button pressed after typing); later changes count as "changed".
     Students never see the log. Failed sends retry on the next change. */
  const LOG = { url: "/.netlify/functions/lab-attempts", timer: null, busy: false };
  const LOG_EMAIL = "studentpreview@theconfidentclinician.me"; /* the preview login; real accounts will pass the student's own email */
  const logSource = () => /(^|\.)theconfidentclinician\.me$/.test(location.hostname) ? "Live" : "Preview";
  const clip = v => String(v == null ? "" : v).trim().slice(0, 1500);
  const optLabel = (opts, k) => { const o = (opts || []).find(x => (Array.isArray(x) ? x[0] : x) === k); return o ? (Array.isArray(o) ? o[1] : o) : k; };
  /* Turn an activity's answers into labeled pairs, in screen order */
  function actPairs(X, v) {
    const out = [], seen = new Set(), add = (k, l, val, exp) => { if (val == null || val === "" || (Array.isArray(val) && !val.length)) return; seen.add(k); out.push([k, l, Array.isArray(val) ? val.join(", ") : String(val), exp || ""]); };
    X.screens.forEach((sc, i) => {
      const T = `${i + 1}. ${sc.title}`;
      if (sc.kind === "tag") sc.items.forEach(([id, txt, ans, , nm]) => add(`t${i}_${id}`, `${T} · ${nm || txt.replace(/[“”]/g, "").slice(0, 60)}`, v[`t${i}_${id}`] && optLabel(sc.options, v[`t${i}_${id}`]), ans && optLabel(sc.options, ans)));
      if (sc.kind === "pick") add(`p${i}`, T, v[`p${i}`] && optLabel(sc.options, v[`p${i}`]), sc.best && optLabel(sc.options, sc.best));
      if (sc.kind === "multi" && v[`m${i}c`]) add(`m${i}`, T, (v[`m${i}`] || []).map(k => optLabel(sc.options, k)), sc.correct.map(k => optLabel(sc.options, k)).join(", "));
      if (sc.kind === "freeze") { sc.rows.forEach(([k, l]) => add(k, `${T} · ${l}`, v[k])); add("mine", `${T} · In my words`, v.mine); }
      if (sc.kind === "reset") add("reset", T, v.reset);
      if (sc.kind === "own") { add("what", `${T} · What happened`, v.what); add("gaps", `${T} · Gaps`, (v.gaps || []).map(k => ACTS.GAP[k])); add("action", `${T} · Action`, v.action); }
      if (sc.kind === "selfcheck") sc.checks.forEach((c, k) => add(`s${k}`, `${T} · ${c}`, v[`s${k}`]));
      if (sc.kind === "write2") sc.fields.forEach(([k, l]) => add(k, `${T} · ${l}`, v[k]));
      if (sc.kind === "check") add("ck", T, v.ck);
      if (sc.kind === "take") add(`t${sc.n}`, T, v[`t${sc.n}`]);
      if (sc.kind === "pausewalk") sc.steps.forEach(([l, nm]) => add(l, `${T} · ${nm}`, v[l]));
      if (sc.kind === "compare") sc.checks.forEach((c, k) => add(`c${k}`, `${T} · ${c}`, v[`c${k}`]));
      if (v[`ai${i}_client`]) add(`ai${i}_client`, `${T} · AI client reply`, v[`ai${i}_client`]);
      if (v[`ai${i}_note`]) add(`ai${i}_note`, `${T} · AI training note`, v[`ai${i}_note`]);
    });
    return out;
  }
  function actMatches(X, first) {
    let n = 0, hit = 0;
    X.screens.forEach((sc, i) => {
      if (sc.kind === "tag" && sc.items.every(it => it[2])) sc.items.forEach(([id, , ans]) => { const f = first[`t${i}_${id}`]; if (f != null) { n++; if (f === optLabel(sc.options, ans)) hit++; } });
      if (sc.kind === "pick" && sc.best && first[`p${i}`] != null) { n++; if (first[`p${i}`] === optLabel(sc.options, sc.best)) hit++; }
      if (sc.kind === "multi" && first[`m${i}`] != null) { n++; if (first[`m${i}`] === sc.correct.map(k => optLabel(sc.options, k)).join(", ")) hit++; }
    });
    return n ? `${hit} of ${n}` : "";
  }
  const flatPairs = (obj, prefix = "") => {
    const out = [];
    Object.entries(obj || {}).forEach(([k, val]) => {
      if (val == null || val === "" || /^(o\d+|i|v|n|idx|step|order)$/.test(k)) return;
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof val === "object" && !Array.isArray(val)) out.push(...flatPairs(val, key));
      else out.push([key, key, Array.isArray(val) ? val.map(x => typeof x === "object" ? JSON.stringify(x) : x).join(" | ") : String(val)]);
    });
    return out;
  };
  /* Build every row from current state */
  function logRows() {
    S.logId = S.logId || Math.random().toString(36).slice(2, 10);
    const rows = [], mk = (key, activity, detail, week, n, status, pairs, extra = {}) => rows.push({ key: `${key}#${n}`, akey: key, activity, detail, week, n, status, pairs, ...extra });
    if (Object.keys(S.base || {}).length) mk("base", "Day 1 Baseline", "", 1, 1, S.sealed ? "Finished" : "In progress",
      D.BASELINE.flatMap(b => { const a = S.base[b.id] || {}, aim = D.AIMS.find(x => x[0] === a.aim); return [[`${b.id}.move`, `${b.client} · Your words`, clip(a.move)], [`${b.id}.aim`, `${b.client} · Going for`, aim ? `${aim[2]} (${aim[1]})` : ""]]; }).filter(p => p[2]));
    ["l1", "l2", "l3"].forEach(k => { const st = S.act && S.act[k]; if (!st || !Object.keys(st.v || {}).length) return; mk("act-" + k, ACTS[k].name, `Lesson ${k.slice(1)}`, 1, st.n || 1, st.done && st.i >= ACTS[k].screens.length - 1 ? "Finished" : "In progress", actPairs(ACTS[k], st.v), { act: k }); });
    if (S.demo && (S.demo.line || S.demo.why)) mk("demo", "Demo: Your Sentence + Why", "Jordan", 1, 1, S.steps.demo ? "Finished" : "In progress", [["line", "Your first sentence", clip(S.demo.line)], ["why", "Why that sentence", clip(S.demo.why)], ["ck", "Gave Jordan the decision back?", S.demo.ck || ""], ["aiNote", "AI training note", clip(S.demo.aiNote)]].filter(p => p[2]));
    if (S.lab && Object.keys(S.lab).length) mk("lab", "The Clinical Blind Spot", "Jordan, session 2", 1, 1, S.steps.lab ? "Finished" : "In progress", flatPairs(S.lab));
    const M = S.sim || {}, SJ = SIMS.jordan;
    [...(M.history || []), M.cur].filter(Boolean).forEach((C, k) => mk("sim", "Jordan Simulation", "Jordan’s Advice Request", 1, k + 1, C.saved ? "Finished" : "In progress",
      SJ.moments.map((m, j) => [`m${j}`, `Moment ${j + 1}`, C.picks && C.picks[j] != null ? clip((m.choices[C.picks[j]] || [])[1]) : ""]).concat(flatPairs(C.intent, "Intention"), flatPairs(C.ref, "Debrief")).filter(p => p[2])));
    Object.entries(S.reps || {}).forEach(([id, x]) => { const r = REP(id); if (!r) return; (x.attempts && x.attempts.length ? x.attempts : [x]).forEach((a, k) => mk("rep-" + id, "Rep", `Rep ${id} · ${r.client}`, r.week, k + 1, x.saved ? "Finished" : "In progress", flatPairs(a))); });
    const LS = S.live || {};
    [...(LS.past || []), ...(LS.cur && !(LS.past || []).includes(LS.cur) && !(LS.past || []).some(p => p.id === LS.cur.id) ? [LS.cur] : [])].forEach((C, k) => {
      if (!C.moments || !C.moments.some(m => (m.attempts || []).length)) return;
      const pairs = [];
      C.moments.forEach((m, mi) => (m.attempts || []).forEach((a, j) => pairs.push([`m${mi}a${j}`, `Moment ${mi + 1} · Attempt ${j + 1}${j < m.attempts.length - 1 ? " (refined)" : ""}`, clip(a.text), "", { clientLine: m.client, note: a.note || "" }])));
      if (C.done) pairs.push(["summary", "Session summary", clip(C.summary), "", { clientLine: C.closing || "" }]);
      mk("live-dana", "Live Session · Dana", `${C.moments.length} moments · ${C.refinesUsed || 0} refines${C.left && !C.done ? " · left early" : ""}`, 1, k + 1, C.done ? "Finished" : "In progress", pairs, { started: C.started });
    });
    if (S.reflect && Object.keys(S.reflect).length) mk("reflect", "Reflect & Redo", "", 1, 1, S.steps.reflect ? "Finished" : "In progress", flatPairs(S.reflect));
    if (S.profile && Object.keys(S.profile).length) mk("profile", "Clinical Confidence Profile", "", 1, 1, S.steps.save ? "Finished" : "In progress", flatPairs(S.profile));
    return rows;
  }
  function logTick() {
    try {
      S.first = S.first || {}; S.logSent = S.logSent || {};
      const now = new Date().toISOString(), out = [];
      logRows().forEach(R => {
        const F = S.first[R.key] = S.first[R.key] || { _started: now };
        let changed = 0;
        R.pairs.forEach(([k, , val]) => { if (!(k in F)) F[k] = val; else if (F[k] !== val) changed++; });
        const answers = R.pairs.map(([k, l, val, exp, extra], j) => ({ key: k, q: l, first: F[k], final: val, expected: exp || "", order: j + 1, ...(extra || {}) }));
        const matches = R.act ? actMatches(ACTS[R.act], Object.fromEntries(R.pairs.map(([k]) => [k, F[k]]))) : "";
        const feedback = Object.entries(S.fb || {}).filter(([, f]) => f.rkey === R.key && f.rating).map(([id, f]) => ({ id, akeys: f.akeys || [], rating: f.rating, note: f.note || "", where: f.where || "", type: f.type || "", ai: f.ai || "", input: f.input || "", at: f.at }));
        const rec = { attemptId: `${LOG_EMAIL}|${R.key}|${S.logId}`, activityKey: R.akey, detail: R.detail, attemptNo: R.n, status: R.status, changed, matches, started: F._started, answers, feedback };
        const sig = JSON.stringify([rec.status, answers, feedback]);
        if (S.logSent[R.key] !== sig) { rec.updated = now; rec._sig = sig; rec._key = R.key; out.push(rec); }
      });
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      if (out.length) { LOG.queue = out; clearTimeout(LOG.timer); LOG.timer = setTimeout(logSend, 1500); }
    } catch (e) { /* logging must never break the page */ }
  }
  async function logSend(useBeacon) {
    const q = (LOG.queue || []).splice(0);
    if (!q.length || LOG.busy) return;
    LOG.busy = true;
    for (let k = 0; k < q.length; k += 10) {
      const part = q.slice(k, k + 10), body = JSON.stringify({ email: LOG_EMAIL, source: logSource(), attempts: part.map(({ _sig, _key, ...r }) => r) });
      try {
        if (useBeacon && navigator.sendBeacon) { navigator.sendBeacon(LOG.url, new Blob([body], { type: "application/json" })); continue; }
        const res = await fetch(LOG.url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
        if (res.ok) { part.forEach(r => { S.logSent[r._key] = r._sig; }); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
      } catch (e) { /* offline or not configured: retry on the next change */ }
    }
    LOG.busy = false;
  }
  addEventListener("pagehide", () => { if ((LOG.queue || []).length) logSend(true); });

  function render() {
    const signedIn = sessionStorage.getItem(PREVIEW_SESSION) === "1";
    $("[data-login]").hidden = signedIn;
    $("[data-app]").hidden = !signedIn;
    if (!signedIn) return;
    const { scr, arg } = route();
    const h = location.hash.slice(1) || "home";
    if (goingBack) goingBack = false; else if (trail[trail.length - 1] !== h) trail.push(h);
    if (trail.length > 50) trail.splice(0, trail.length - 50);
    setMenu(false);
    $$("[data-back]").forEach(b => { b.hidden = scr === "home"; });
    const navKey = scr === "rep" ? "reproom" : scr === "baseline" || scr === "act" ? "week" : scr;
    if (scr === "live" && liveState().cur && liveState().showIntro === undefined) liveState().showIntro = !!liveState().cur.done;
    const tabs = NAV.map(([k, label, short], i) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${i === -1 ? short : label}</button>`).join("");
    $("[data-tabs]").innerHTML = tabs;
    $("[data-bottom]").innerHTML = NAV.map(([k, , short]) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${short}</button>`).join("");
    $$("[data-preview-toggle]").forEach(pv => { pv.textContent = S.reviewer ? "Preview · all open" : "Preview"; pv.classList.toggle("on", S.reviewer); pv.setAttribute("aria-pressed", S.reviewer); });

    const views = { home: homeView, week: weekView, act: actView, live: liveView, rep: repView, baseline: baselineView, reproom: roomView, playbook: playbookView, growth: growthView };
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
    bindAI();
    logTick();
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
      + sec("practice", "Practice", "", item("live", "Live session · Dana", navKey === "live", "New", "ai") + item("reproom", "Rep Room", navKey === "reproom") + item("playbook", "Clinical Playbook", navKey === "playbook") + item("growth", "My growth", navKey === "growth"))
      + sec("later", "Coming up", "", D.WEEKS.slice(1).map(w => `<div class="sb-item off"><i aria-hidden="true"></i><span>Week ${w.n} · ${esc(w.theme)}</span><em>${S.start && !weekOpen(w.n) ? fmtDay(opensAt(w.n)) : weekOpen(w.n) ? "Open" : "Soon"}</em></div>`).join(""));
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
    if (i >= D.WEEK1.length) return { tag: "Week 1 complete", title: weekOpen(2) ? "Week 2 is open" : `Week 2 opens ${fmtDay(opensAt(2), true)}`, meta: "Getting Unstuck in the Room · Decide", cta: "Review Week 1", go: "week" };
    const s = D.WEEK1[i];
    if (s.type === "day1") return { tag: "Start here", title: "Welcome + Day 1 Baseline", meta: "A short welcome video, then four client moments to see where you’re starting", cta: anyProgress() ? "Continue Day 1" : "Start Day 1", go: "week/day1" };
    if (s.type === "lesson") { const r = REP(s.rep); return { tag: s.kind, title: s.title, meta: `Watch the lesson, then practice with ${r.client}`, cta: "Continue", go: "week/" + s.key }; }
    return { tag: s.kind, title: s.title, meta: s.meta, cta: "Continue", go: "week/" + s.key };
  }
  function homeView() {
    const n = nextInfo(), d = doneCount(), t = D.WEEK1.length;
    const hero = `<div class="hm-head"><div class="v6-label">${anyProgress() ? "Welcome back" : "Welcome"} · Week 1 of 4</div>
      <h1 class="display">Build confidence through <em>practice.</em></h1>
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
        <div class="w4-head"><h2><em>Four</em> weeks.</h2><p>A new week opens every ${DRIP_DAYS} days, once you’ve finished the week before.</p></div>
        <ol>${D.WEEKS.map(w => {
          const cur = w.n === 1, open = weekOpen(w.n);
          const status = cur ? (d ? `${d} of ${t} done` : "Open now") : weekStatus(w.n);
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
        ${L.compared ? `<div class="compare-2"><div class="bd-p"><small>Your version</small>${q(mv)}</div><div class="bd-p t"><small>Another way to say it</small><span class="tk">${q(A.take)}</span></div></div>
          <div class="coach"><small>Why it works</small>${esc(A.takeWhy)}</div>
          ${aiBox("lab-r4", "Hear how Jordan responds to your line 4", "react", () => ({ who: "Jordan, 29, in session 2", context: "Jordan keeps having the same fights with their partner and feels like they're always the one who has to bring things up, and then they're the bad guy.", line: A.lines[2][1], response: (S.lab.move || "").trim() }), res => { S.lab.aiClient = res.client; S.lab.aiNote = res.note; }, { req: ["response"], who: "Jordan", wait: "Jordan is responding…", rkey: "lab#1", akeys: ["aiClient", "aiNote"], where: "Clinical Blind Spot · Line 4 rewrite" })}
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
    else fwd = S.steps.lab ? `<button type="button" class="v6-btn primary next" data-go="week/sim">Next: Jordan’s Advice Request →</button>` : `<button type="button" class="v6-btn primary" data-lab-finish>Finish the Lab ✓</button>`;
    return `<div class="flow">${head}${st === 0 ? `<div class="fiction">Fictional practice scenario. Never enter real client details.</div>` : ""}${body}<div class="actions" style="justify-content:space-between">${back}${fwd}</div></div>`;
  }

  /* ---------- Week 1 Reflect & Redo ---------- */
  const RF_STEPS = ["Your Pull", "Pick one", "Three Checks", "Redo it"];
  /* Everything the student wrote this week that can be redone */
  function rfPool() {
    const out = [], v2 = actV("l2"), v3 = actV("l3");
    if ((v2.r1 || "").trim()) out.push({ id: "l2", tag: "Lesson 2 · Catch the Reaction", who: "Client", line: q("I think you don’t understand me either."), first: v2.r1 });
    if ((v3.t1 || "").trim()) out.push({ id: "l3", tag: "Lesson 3 · Two Takes", who: "Client", line: q("I don’t even know what I feel anymore."), first: v3.t1 });
    if (S.demo && (S.demo.line || "").trim()) out.push({ id: "demo", tag: "Demo · Jordan", who: "Jordan", line: q(ACTS.demo.moment), first: S.demo.line });
    D.REPS.filter(r => r.week === 1 && repSaved(r.id)).forEach(r => { const x = S.reps[r.id]; out.push({ id: "rep:" + r.id, rep: r.id, tag: `Rep ${r.id} · ${r.client}`, who: r.client, line: r.line ? q(r.line) : esc(r.stageLine), first: (x.attempts[0] && x.attempts[0].move) || x.move || x.line || "" }); });
    return out;
  }
  function reflectHTML() {
    const F = S.reflect, st = Math.min(F.step || 0, 3);
    const reps = rfPool();
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
      body = `<p class="flow-q">Pick your weakest answer.</p><p class="flow-sub">The one you’d most like a do-over on, from this week’s activities.</p>
        ${reps.length ? `<div class="choices">${reps.map(z => `<button type="button" class="choice rf-rep" data-rf-rep="${z.id}" aria-pressed="${F.rep === z.id}"><small>${esc(z.tag)}</small><span class="cl">${z.line}</span><span class="mine">You: ${q(z.first)}</span></button>`).join("")}</div>`
          : `<div class="empty">Finish a lesson activity first. <button type="button" class="v6-link" data-go="act/l2">Go to Catch the Reaction →</button></div>`}`;
      ok = !!r;
    }
    if (st === 2 && r) {
      const ck = F.ck || {};
      body = `<p class="flow-q">Run the Three Checks on your first answer.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${r.who[0]}</span><span class="col"><span class="who">${esc(r.who)}</span><span class="said md">${r.line}</span></span></div>
        <div class="you-said sm"><small>Your first answer</small>${q(r.first)}</div>
        <div class="sort">${D.CHECKS.map(([t, d], i) => `<div class="sort-row"><span class="st"><b>${i + 1}. ${esc(t)}</b><br><small style="color:var(--muted)">${esc(d)}</small></span><span class="sb">${["Yes", "Not quite", "Not sure"].map(v => `<button type="button" class="chip" data-rf-ck="${i}" data-v="${v}" aria-pressed="${ck[i] === v}">${v}</button>`).join("")}</span></div>`).join("")}</div>
        ${D.CHECKS.every((_, i) => ck[i]) ? `<div class="reveal">${D.CHECKS.filter((_, i) => ck[i] !== "Yes").length ? `<b>Your redo target:</b> ${D.CHECKS.map(([t], i) => ck[i] !== "Yes" ? esc(t) : "").filter(Boolean).join(" · ")}` : `<b>All three held up.</b> Redo it anyway and try a different route.`}</div>` : ""}`;
      ok = D.CHECKS.every((_, i) => ck[i]);
    }
    if (st === 3 && r) {
      body = `<p class="flow-q">${esc(D.REFLECT[2][1])} Then name the one thing you changed.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${r.who[0]}</span><span class="col"><span class="who">${esc(r.who)}</span><span class="said md">${r.line}</span></span></div>
        <label class="field">Your redo<textarea class="v6-ta" rows="3" data-rf="redoLine" placeholder="Say it out loud first, then write it">${esc(F.redoLine)}</textarea></label>
        <label class="field">${esc(D.REFLECT[2][2])}<textarea class="v6-ta" rows="2" data-rf="redo" placeholder="The one thing I changed…">${esc(F.redo)}</textarea></label>
        ${S.steps.reflect ? `<div class="bd-paths"><div class="bd-p"><small>Before</small>${q(r.first)}</div><div class="bd-p t"><small>After</small>${q(F.redoLine)}</div></div>
          ${!r.rep ? `<div class="hint">✓ Saved. Your redo shows up in your Profile.</div>` : S.reps[r.rep].line === F.redoLine ? `<div class="hint">✓ This is now your Playbook line for Rep ${r.rep}.</div>` : `<button type="button" class="v6-link" data-rf-useline>Make this my Playbook line for Rep ${r.rep} →</button>`}` : ""}`;
      ok = !!(F.redoLine || "").trim() && !!(F.redo || "").trim();
    }
    const back = st ? `<button type="button" class="v6-btn secondary" data-rf-nav="-1">← Back</button>` : "<span></span>";
    const fwd = st < 3 ? `<button type="button" class="v6-btn primary" data-rf-nav="1"${ok ? "" : " disabled"}>Next: ${RF_STEPS[st + 1]} →</button>`
      : S.steps.reflect ? `<button type="button" class="v6-btn primary next" data-go="week/save">Next: Your Profile →</button>` : `<button type="button" class="v6-btn primary" data-rf-save${ok ? "" : " disabled"}>Save my redo ✓</button>`;
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
      <div class="actions">${C.saved ? `<button type="button" class="v6-btn primary next" data-go="week/reflect">Next: Reflect & Redo →</button><button type="button" class="v6-btn secondary" data-sim-again>Try the session again</button>`
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
        ["Watch the welcome video", ""],
        ["Answer four client moments", `${D.BASELINE.map(b => b.client).join(", ")} each say something hard to answer. Write what you’d say and pick what you were going for. No right answers today.`]
      ], "Why: these answers are your starting point. In Week 4 you’ll answer the same four moments again and see, side by side, how you’ve grown.");
      const watch = S.welcome ? `<button type="button" class="v6-btn secondary" data-act="welcome">Welcome watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="welcome">${D.VIDEOS.welcome ? "I’ve watched the welcome" : "Mark the welcome watched"}</button>`;
      const base = S.sealed ? `<button type="button" class="v6-btn secondary" data-go="growth">See My growth</button>`
        : `<button type="button" class="v6-btn ${S.welcome ? "primary" : "secondary"}" data-go="baseline">${answered ? `Continue the Baseline (${answered} of 4)` : "Start the Baseline"}</button>`;
      cta = watch + base;
    }
    if (s.type === "lesson") {
      const r = REP(s.rep), X = ACTS[s.key], st = ACT(s.key), n = X.screens.length;
      const started = st.i > 0 || st.done;
      body = `<div class="act-card look-${X.look}"><span class="v6-label">Your practice</span><span class="ac-name">${esc(X.name)}</span><span class="ac-t">${esc(X.teaser)}</span>
          <span class="ac-meta">${st.done ? "✓ Done" : started ? `Screen ${st.i + 1} of ${n}` : `${n} short screens`}</span></div>
        <p class="more-rep">Want extra practice later? <button type="button" class="v6-link" data-go="rep/${r.id}">Rep ${r.id} with ${esc(r.client)}</button> is in the Rep Room.</p>`;
      cta = (S.watched[s.key] ? `<button type="button" class="v6-btn secondary" data-act="watch" data-key="${s.key}">Lesson watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="watch" data-key="${s.key}">${D.VIDEOS[s.video] ? "I’ve watched the lesson" : "Mark lesson watched"}</button>`)
        + `<button type="button" class="v6-btn ${S.watched[s.key] ? "primary" : "secondary"}" data-go="act/${s.key}">${st.done ? "Do it again" : started ? "Continue the activity" : "Start the activity"}</button>`;
    }
    if (s.type === "demo") {
      body = `<div class="quote-box"><span class="v6-label">${esc(s.quoteLabel)}</span><span class="ctx">${esc(s.context)}</span><span class="line">${esc(s.moment)}</span><span class="pull">${esc(s.pull)}</span></div>`;
      const DM = S.demo = S.demo || {}, AD = ACTS.demo;
      body += `<div class="act-card look-demo demo-turn"><span class="v6-label">Your turn</span><span class="ac-name">Your sentence + your why</span>
          <div class="speaker boxed"><span class="av" aria-hidden="true">J</span><span class="col"><span class="who">Jordan</span><span class="said md">${q(AD.moment)}</span></span></div>
          <label class="field">Your first sentence to Jordan<textarea class="v6-ta" rows="2" data-demo="line" placeholder="Say it out loud first, then write it">${esc(DM.line)}</textarea></label>
          <label class="field">Why that sentence? <small>${esc(AD.hintWhy)}</small><textarea class="v6-ta" rows="2" data-demo="why" placeholder="I chose it because…">${esc(DM.why)}</textarea></label>
          <div class="field">${esc(AD.check)}<div class="chips-row">${["Yes", "Not quite", "Not sure"].map(o => `<button type="button" class="chip" data-demo-ck="${o}" aria-pressed="${DM.ck === o}">${o}</button>`).join("")}</div></div>
          ${aiBox("demo-why", "Get a follow-up question on my why", "why", () => ({ line: AD.moment, sentence: DM.line || "", why: DM.why || "" }), res => { DM.aiNote = res.note; }, { req: ["sentence", "why"], rkey: "demo#1", akeys: ["aiNote"], where: "Demo · Your why" })}</div>`;
      const dOk = (DM.line || "").trim().length >= 3 && (DM.why || "").trim().length >= 3 && DM.ck;
      cta = (DM.watched ? `<button type="button" class="v6-btn secondary" data-act="demowatch">Demo watched ✓</button>` : `<button type="button" class="v6-btn primary" data-act="demowatch">Mark demo watched</button>`)
        + (done ? `<button type="button" class="v6-btn secondary" disabled>Saved ✓</button>` : `<button type="button" class="v6-btn ${DM.watched ? "primary" : "secondary"}" data-act="demosave"${dOk && DM.watched ? "" : " disabled"}>Save my turn ✓</button>`);
    }
    if (s.type === "lab" || s.type === "sim") {
      body = locked ? itemsHTML(s.itemsLabel, s.items) : s.type === "lab" ? labHTML() : simHTML();
      cta = "";
    }
    if (s.type === "reflect") { body = reflectHTML(); cta = ""; }
    if (s.type === "save") {
      const pf = S.profile, M = S.sim, L = S.lab, P = pf.plan = pf.plan || {};
      const v1 = actV("l1"), v2 = actV("l2"), v3 = actV("l3");
      const gaps = (v1.gaps || []).map(k => ACTS.GAP[k]).filter(Boolean);
      const SJ = SIMS.jordan, SC = (M.cur && M.cur.saved) ? M.cur : (M.history || []).slice(-1)[0];
      const path = SC && Object.keys(SC.picks).length === 8 ? SJ.moments.map((m, k) => `Moment ${k + 1}: ${(m.choices[SC.picks[k]] || [])[1] || ""}`).join("\n") : "";
      const auto = {
        gap: gaps.length ? `${gaps.join(" + ")}. ${v1.action ? "This week: " + v1.action : ""}`.trim() : "",
        pull: [S.reflect.pullPick, v2.thought && `First cue: “${v2.thought}”${v2.body && v2.body !== "Not sure" ? `, ${v2.body.toLowerCase()}` : ""}`, v2.reset && `Reset: ${v2.reset.toLowerCase()}`, SC && SC.ref[0]].filter(Boolean).join(". "),
        move: L.move || "",
        shift: (SC && SC.ref[1]) || "",
        adjust: (SC && SC.ref[2]) || ""
      };
      const sec = (k, label, hint, ph) => { const v = pf[k] != null ? pf[k] : auto[k]; return `<label class="field">${esc(label)}${hint ? ` <small>${esc(hint)}</small>` : ""}<textarea class="v6-ta" rows="2" data-p="${k}" placeholder="${esc(ph)}">${esc(v)}</textarea></label>`; };
      const lines = [[ "When a client says I don’t understand them…", v2.r2 ], ["When a client doesn’t know what they feel…", v3.t2], ["When a client says don’t make me feel better…", v3.t3], ["When a client asks me to decide for them…", S.demo && S.demo.line]].filter(x => (x[1] || "").trim())
        .concat(D.REPS.filter(r => r.week === 1 && repSaved(r.id) && S.reps[r.id].line.trim()).map(r => [r.bank + "…", S.reps[r.id].line]));
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
        ${lines.length ? `<div class="bank">${lines.map(([w, l]) => `<div class="bank-item"><span class="w">${esc(w)}</span><span class="l">${q(l)}</span></div>`).join("")}</div>` : `<div class="empty">Your lines land here as you finish the lesson activities.</div>`}
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
    const nextBtn = done && nxt && !["lab", "sim", "reflect"].includes(s.type) ? `<button type="button" class="v6-btn primary next" data-go="week/${nxt.key}">Next: ${esc(nxt.short)} →</button>` : "";
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
      <div class="soon-note">This Rep is still being written. Its reactions and full walkthrough arrive with Week ${r.week}.</div></div>`, title: `Rep ${r.id} · ${r.client}`, crumb: ["Rep Room", `Rep ${r.id}`, "reproom"], rail: repRailHTML(1, false) };

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
    { const n = D.REPS.find(z => z.week === r.week && z.id > r.id && !z.pending); nextLine = n ? `Next: Rep ${n.id} with ${n.client}.` : "Back to the Rep Room for more."; }

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
      const guide = Object.entries(r.reactions || {}).map(([aim, z]) => [].concat(z).map(y => `If the move was mostly ${aim}${y.move ? ` (${y.move})` : ""}: ${name} says "${y.says}"${y.shows ? ` (${y.shows})` : ""}`).join(" ")).join("\n");
      const aiReact = aiBox(`rep-${r.id}`, `Hear how ${name} responds to your words`, "react", () => ({ who: name, context: r.context || "", line: r.line || r.stageLine || "", response: (x.move || "").trim(), guide }), res => { x.aiClient = res.client; x.aiNote = res.note; }, { auto: true, req: ["response"], who: name, wait: `${name} is responding…`, rkey: `rep-${r.id}#${Math.max(1, (x.attempts || []).length)}`, akeys: ["aiClient", "aiNote"], where: `Rep ${r.id} · ${name} reacts` });
      html += `<div class="card stack-12"><span class="v6-label">4 · ${esc(name)} reacts to your words</span>${aiReact}
        <details class="act-ex rep-more"><summary>Other ways this moment can go</summary><div class="stack-12" style="margin-top:10px">${reacts.length ? reacts.map(z => `<div class="reaction-alt">${z.move ? `<p class="move-label" style="margin:0 0 8px">${reacts.length > 1 ? "If your move sounded like" : "A move like"} <b>${esc(z.move)}</b></p>` : ""}
        <div class="speaker"><span class="av" aria-hidden="true">${name[0]}</span><span class="col">${z.stage ? `<span class="stage">${esc(z.stage)}</span>` : ""}<span class="said md">${q(z.says)}</span>${z.after ? `<span class="stage">${esc(z.after)}</span>` : ""}<span class="shows">${esc(z.shows)}</span></span></div></div>`).join("")
        : `<div style="font-size:15px;color:var(--ink-2)">Here’s one way to handle it.</div>`}</div></details>
        ${beat2 ? `<label class="field" style="margin-top:8px;padding-top:14px;border-top:1px solid var(--line-2)"><span class="v6-label">Keep going · ${esc(r.beat2.prompt)}</span>${r.beat2.note ? `<small>${esc(r.beat2.note)}</small>` : ""}<textarea class="v6-ta" rows="2" data-beat2 placeholder="Your next move, in your own words">${esc(x.beat2)}</textarea></label>` : ""}
      </div>
      <div class="card stack-12 pullq"><span class="v6-label">What pulled at you?</span><span class="pq-sub">Everyone feels a different urge in hard moments. Which one showed up for you here?</span>
        <div class="chips-row pulls-row">${D.PULLS.map(([k, d]) => `<button type="button" class="chip" data-mypull="${k}" aria-pressed="${x.pull === k}" title="${esc(d)}">${k}</button>`).join("")}<button type="button" class="chip" data-mypull="steady" aria-pressed="${x.pull === "steady"}">I felt steady</button></div>
        ${x.pull ? `<span class="pq-fb">${x.pull === "steady" ? "Nice. Notice what helped you stay steady here." : `<b>${esc(x.pull)}:</b> ${esc((D.PULLS.find(p => p[0] === x.pull) || [])[1] || "")}.`}${x.pull !== "steady" && x.pull !== r.take.pull ? ` ${esc(r.take.pull)} is another common one here. There’s no wrong answer.` : x.pull === r.take.pull ? " That’s a really common one here." : ""}</span>` : ""}</div>
      <div class="card sage stack-12 take"><span class="v6-label forest">5 · One way to handle it</span>
        <div class="pull">${esc(r.take.text)}</div>
        <div class="say"><small>${esc(r.take.sayLabel || "One way to say it")}</small><div>${q(r.take.say)}</div></div>
        ${r.take.beat2Say ? `<div class="say"><small>For Beat 2, try</small><div>${q(r.take.beat2Say)}</div></div>` : ""}
        <div class="why">${r.take.why ? esc(r.take.why) + " " : ""}<b>Watch for</b> ${esc(r.take.watch)}</div>
      </div>`;
      if (r.extra === "gap") html += `<div class="card stack-12"><span class="v6-label">Extra step · Which gap showed up for you?</span>
        <div class="aims">${D.GAPS.map(([k, label, hint]) => `<button type="button" class="aim" data-gap="${k}" aria-pressed="${x.gap === k}"><span>${esc(label)}</span><small>${esc(hint)}</small></button>`).join("")}</div>
        <button type="button" class="aim none" data-gap="none" aria-pressed="${x.gap === "none"}"><span>None of these showed up for me</span><small>That’s useful to know too</small></button>
        <button type="button" class="aim none" data-gap="confident" aria-pressed="${x.gap === "confident"}"><span>I felt confident here</span><small>I knew what to say and why</small></button>
        <span class="hint">${x.gap === "none" ? "Got it. You can come back and pick one if something clicks later." : x.gap === "confident" ? "Love that. Notice what made this one feel steady, so you can find it again." : "Your answer pre-fills your Clinical Confidence Profile."}</span></div>`;
      html += `<div class="card stack-12"><span class="v6-label">6 · Run it back</span><div style="font-size:14px;color:var(--ink-2)">Want another go? Try it again and test it with the Three Checks. Then write the line you’d want to remember next time this happens.</div>
        ${x.attempts.length ? `<div class="attempts">${x.attempts.map((a, i) => `<div><small>Try ${i + 1}</small>${q(a.move)}${a.aim ? ` · ${esc((aims.find(z => z[0] === a.aim) || [])[1] || "")}` : ""}</div>`).join("")}</div>` : ""}
        <label class="field">Your line to keep <small>${esc(r.bank)}…</small><textarea class="v6-ta" rows="2" data-line placeholder="Your best line, in your own words">${esc(x.line)}</textarea></label>
        ${x.saved ? `<div class="saved-box"><span><b>✓ Saved</b> to your Playbook. ${esc(nextLine)}</span><button type="button" class="v6-link" data-go="playbook">Open Playbook →</button></div>
          <div class="actions"><button type="button" class="v6-btn secondary" data-act="again">↺ Try again</button><button type="button" class="v6-btn secondary" data-go="reproom">Back to the Rep Room</button></div>`
        : `<div class="actions"><button type="button" class="v6-btn secondary" data-act="again">↺ Try again</button><button type="button" class="v6-btn primary" data-act="saveline"${(x.line || "").trim() ? "" : " disabled"}>Save to “What I Say When…”</button></div>`}
      </div>`;
    }
    const crumb = ["Rep Room", `Rep ${r.id}`, "reproom"];
    return {
      html, tight: true, title: `Rep ${r.id} · ${r.title}`, plain: true, sub: `Extra practice for Lesson ${r.id.split(".")[1]}: ${r.lesson}. Unlike Day 1, you’ll see how ${r.client} reacts, see one way to handle it, and then try it again.`, crumb, rail: repRailHTML(stage, x.saved),
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

  /* ---------- Lesson activities: one screen at a time ---------- */
  /* Builder note marking where AI could come in later. Shown on this preview build only. */
  const aiNote = t => t ? `<div class="ai-note"><b>✦ AI spot</b><span>${esc(t)}</span></div>` : "";
  const momentHTML = m => m ? `<div class="act-moment"><span class="who">${esc(m.who)}</span>${m.ctx ? `<span class="ctx">${esc(m.ctx)}</span>` : ""}<span class="line">${q(m.line)}</span></div>` : "";
  const pickChips = (attr, opts, cur, extra = "") => `<div class="act-chips">${opts.map(o => { const [k, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" class="act-chip" ${attr}="${esc(k)}"${extra} aria-pressed="${cur === k}">${esc(l)}</button>`; }).join("")}</div>`;
  /* Shuffled order per attempt, never the original order, so answers don't line up with the chips */
  const ord = (v, k, ids) => {
    if (!v[k] || v[k].length !== ids.length) { let o; do { o = shuffle(ids.length).map(j => ids[j]); } while (ids.length > 1 && o.every((x, j) => x === ids[j])); v[k] = o; }
    return v[k].map(id => ids.indexOf(id)).filter(j => j > -1);
  };
  const filled = (t, n = 3) => (t || "").trim().length >= n;
  function actScreen(X, i, v) {
    const sc = X.screens[i], K = sc.kind;
    /* First answers are locked behind the scenes; if they change their pick, show what they chose first */
    const F = ((S.first || {})[`act-${X.key}#${(S.act[X.key] || {}).n || 1}`]) || {};
    const firstNote = (k, curLabel) => F[k] != null && F[k] !== curLabel ? `<span class="first-pick">Your first pick: ${esc(F[k])}</span>` : "";
    let h = `<h2 class="act-h">${esc(sc.title)}</h2>`, ok = true;
    if (K === "intro") {
      h += `<p class="act-p">${esc(sc.text)}</p>`;
      if (sc.cards) h += `<div class="act-cards n${sc.cards.length}">${sc.cards.map(([t, d, n]) => `<div class="act-cardlet"><b>${esc(t)}</b><span>${esc(d)}</span>${n ? `<small>${esc(n)}</small>` : ""}</div>`).join("")}</div>`;
      if (sc.pause) h += `<div class="act-pause">${D.PAUSE.map(([l, t]) => { const [nm, ...rest] = t.split(": "); return `<div><span class="lt">${l}</span><span><b>${esc(nm)}</b> ${esc(rest.join(": "))}</span></div>`; }).join("")}</div>`;
    }
    if (K === "tag") {
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p>${sc.legend ? `<div class="act-legend">${sc.options.map(([, l, d]) => `<div><b>${esc(l)}</b><span>${esc(d)}</span></div>`).join("")}</div>` : ""}<div class="act-tags">${ord(v, "o" + i, sc.items.map(x => x[0])).map(j => sc.items[j]).map(([id, txt, ans, why, nm]) => {
        const cur = v[`t${i}_${id}`], lab = k => (sc.options.find(o => o[0] === k) || [])[1];
        const fb = cur ? (cur === ans ? `<div class="act-fb yes"><b>Yes, ${esc(lab(ans))}.</b> ${esc(why)}</div>` : `<div class="act-fb no"><b>Closer to ${esc(lab(ans))}.</b> ${esc(why)}</div>`) : "";
        const long = !sc.legend && sc.options.some(o => o[1].length > 28);
        return `<div class="act-tag${cur ? " answered" : ""}${long ? " long" : ""}">${nm ? `<span class="nm">${esc(nm)}</span>` : ""}<span class="tx">${esc(txt)}</span>${pickChips("data-av", sc.options, cur, ` data-f="t${i}_${id}"`)}${fb}${cur ? firstNote(`t${i}_${id}`, lab(cur)) : ""}</div>`;
      }).join("")}</div>`;
      ok = sc.items.every(([id]) => v[`t${i}_${id}`]);
    }
    if (K === "pick") {
      const cur = v[`p${i}`], o = sc.options.find(x => x[0] === cur);
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p><div class="act-picks">${ord(v, "o" + i, sc.options.map(x => x[0])).map(j => sc.options[j]).map(([k, l]) => `<button type="button" class="act-pick" data-av="${k}" data-f="p${i}" aria-pressed="${cur === k}">${esc(l)}</button>`).join("")}</div>`
        + (o ? `<div class="act-fb ${cur === sc.best ? "yes" : "no"}">${esc(o[2])}</div>${firstNote(`p${i}`, o[1])}` : "");
      ok = !!cur;
    }
    if (K === "multi") {
      const sel = v["m" + i] || [], done = !!v["m" + i + "c"];
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p><div class="act-chips">${sc.options.map(([k, l]) => `<button type="button" class="act-chip${done ? (sc.correct.includes(k) ? " ok" : sel.includes(k) ? " off" : "") : ""}" data-mv="${k}" data-f="m${i}" aria-pressed="${sel.includes(k)}">${esc(l)}</button>`).join("")}</div>`;
      if (!done) h += `<button type="button" class="v6-btn secondary act-check" data-mcheck="m${i}c"${sel.length ? "" : " disabled"}>Check my answer</button>`;
      else { const hit = sc.correct.every(k => sel.includes(k)) && sel.every(k => sc.correct.includes(k)); h += `<div class="act-fb ${hit ? "yes" : "no"}"><b>${hit ? "Yes, both." : `It’s ${sc.correct.map(k => ACTS.GAP[k] || k).join(" + ")}.`}</b> ${esc(sc.fb)}</div>`; }
      ok = done;
    }
    if (K === "selfcheck") {
      const any = sc.checks.some((_, k) => v["s" + k] === "Not yet");
      h += `<p class="act-p">${esc(sc.text)}</p><div class="act-you"><small>Your action</small>${esc(v.action || "")}</div>
        <div class="act-checks">${sc.checks.map((c, k) => `<div class="ack"><span>${esc(c)}</span>${pickChips("data-av", ["Yes", "Not yet"], v["s" + k], ` data-f="s${k}"`)}</div>`).join("")}</div>
        ${any ? `<label class="field">Tighten it <small>Add who, when, or how many times.</small><textarea class="v6-ta" rows="2" data-at="action">${esc(v.action)}</textarea></label>` : ""}
        ${aiBox(`act-${X.key}-${i}`, "Get a second look at my plan", "plan", () => ({ what: v.what || "", gap: (v.gaps || []).map(k => ACTS.GAP[k]).join(" + "), action: v.action || "" }), res => { v[`ai${i}_note`] = res.note; }, { req: ["action"], rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` })}`;
      ok = sc.checks.every((_, k) => v["s" + k]) && filled(v.action);
    }
    if (K === "own") {
      const g = v.gaps || [];
      h += `<p class="act-p">${esc(sc.text)}</p>
        <label class="field">${esc(sc.fields[0][1])}<textarea class="v6-ta" rows="2" data-at="what" placeholder="${esc(sc.fields[0][2])}">${esc(v.what)}</textarea></label>
        <div class="field">Which gap or gaps fit? <small>More than one can be true.</small><div class="act-chips">${Object.entries(ACTS.GAP).map(([k, l]) => `<button type="button" class="act-chip" data-gapt="${k}" aria-pressed="${g.includes(k)}">${l}</button>`).join("")}</div></div>
        ${g.length ? `<div class="act-hints">${g.map(k => `<span><b>${ACTS.GAP[k]}:</b> ${esc(sc.gapActions[k])}</span>`).join("")}</div>` : ""}
        <label class="field">${esc(sc.fields[1][1])}<textarea class="v6-ta" rows="2" data-at="action" placeholder="Specific enough to do this week">${esc(v.action)}</textarea></label>
        <details class="act-ex"><summary>See an example</summary><p>${esc(sc.example)}</p></details>`;
      ok = filled(v.what) && filled(v.action) && g.length > 0;
    }
    if (K === "freeze") {
      h += `<div class="act-freeze">${momentHTML(sc.moment)}<span class="fz" aria-hidden="true">❚❚ Paused</span></div><p class="act-p">${esc(sc.text)}</p>`
        + sc.rows.map(([k, l, opts]) => `<div class="field">${esc(l)}${pickChips("data-av", opts, v[k], ` data-f="${k}"`)}</div>`).join("")
        + `<label class="field">${v.body === "Somewhere else" ? "Where do you feel it?" : "In my words"} <small>${v.body === "Somewhere else" ? "Your words" : "Optional"}</small><input class="v6-in" type="text" data-at="mine" value="${esc(v.mine)}" placeholder="${v.body === "Somewhere else" ? "e.g. my shoulders, my stomach" : "What actually goes on for you"}"></label>`;
      ok = sc.rows.every(([k]) => v[k]);
    }
    if (K === "reset") {
      h += `<p class="act-p">${esc(sc.text)}</p><div class="act-picks">${sc.options.map(o => `<button type="button" class="act-pick" data-av="${esc(o)}" data-f="reset" aria-pressed="${v.reset === o}">${esc(o)}</button>`).join("")}</div>`
        + (v.reset ? (() => { const calm = /steady|No strong|didn’t feel/.test([v.thought, v.urge, v.body].join(" ")) && !/Held|Tight|warm|Leaning|Somewhere/.test(v.body || ""); const cue = v.body && !/Somewhere|didn’t feel/.test(v.body) ? v.body.toLowerCase() : "that pull";
            return `<div class="act-fb yes">${calm ? `Nice that this one didn’t rattle you. Keep it ready anyway: when a moment does get to you, ${esc(v.reset.toLowerCase())} first.` : `Good. Next time you notice ${esc(cue)}, that’s your cue to ${esc(v.reset.toLowerCase())}.`}</div>`; })() : "");
      ok = !!v.reset;
    }
    if (K === "write2") {
      h += momentHTML(sc.moment) + sc.fields.map(([k, l, ph]) => `<label class="field">${esc(l)}<textarea class="v6-ta" rows="2" data-at="${k}" placeholder="${esc(ph)}">${esc(v[k])}</textarea></label>`).join("")
        + `<details class="act-ex"><summary>See an example</summary><p>${esc(sc.example)} Don’t memorize it. Say it your way.</p></details>
        ${aiBox(`act-${X.key}-${i}`, "Hear how the client responds", "react", () => ({ who: "a client in session 6, arms crossed", context: "Last week the therapist suggested a thought record. The client didn't do it and feels like every helper hands them homework instead of listening.", line: sc.moment.line, response: (v.r2 || v.r1 || "").trim() }), res => { v[`ai${i}_client`] = res.client; v[`ai${i}_note`] = res.note; }, { req: ["response"], who: "Client", wait: "The client is responding…", rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` })}`;
      ok = sc.fields.every(([k]) => filled(v[k]));
    }
    if (K === "check") {
      const cur = v.ck;
      h += `<div class="act-you"><small>You said</small>${q(v[sc.show] || v.r1 || "")}</div><p class="act-p big">${esc(sc.text)}</p>${pickChips("data-av", sc.options, cur, ' data-f="ck"')}`
        + (cur ? `<div class="act-fb ${cur === "Yes" ? "yes" : "no"}">${esc(sc.fb[cur])}</div>` : "");
      ok = !!cur;
    }
    if (K === "take") {
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p><label class="field"><span class="take-n">Take ${sc.n}</span><textarea class="v6-ta" rows="3" data-at="t${sc.n}" placeholder="Type it the way you’d say it">${esc(v["t" + sc.n])}</textarea></label>${sc.ai ? aiBox(`act-${X.key}-${i}`, "Hear her response", "react", () => ({ who: "a client in session 4 who has had a hard month", context: "Earlier she said she doesn't know what she feels anymore. Now she's pushing back: she doesn't want to be cheered up, she wants room to say how bad it feels.", line: sc.moment.line, response: (v["t" + sc.n] || "").trim() }), res => { v[`ai${i}_client`] = res.client; v[`ai${i}_note`] = res.note; }, { req: ["response"], who: "Client", wait: "She’s responding…", rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` }) : ""}`;
      ok = filled(v["t" + sc.n]);
    }
    if (K === "pausewalk") {
      h += momentHTML(sc.moment) + `<div class="act-walk">${sc.steps.map(([l, nm, pr, ph]) => `<label class="aw"><span class="lt">${l}</span><span class="aw-b"><b>${esc(nm)}</b> ${esc(pr)}${l === "U" ? "" : " <small>Optional</small>"}<input class="v6-in" type="text" data-at="${l}" value="${esc(v[l])}" placeholder="${esc(ph)}"></span></label>`).join("")}</div>`;
      ok = filled(v.U, 2);
    }
    if (K === "compare") {
      h += `<div class="act-cmp"><div><small>Take 1 · instinct</small>${q(v.t1 || "")}</div><div class="t2"><small>Take 2 · P.A.U.S.E.</small>${q(v.t2 || "")}</div></div>
        <div class="act-checks">${sc.checks.map((c, k) => `<div class="ack"><span>${esc(c)}</span>${pickChips("data-av", ["Yes", "Not quite"], v["c" + k], ` data-f="c${k}"`)}</div>`).join("")}</div>
        ${aiBox(`act-${X.key}-${i}`, "What changed between my takes?", "compare", () => ({ line: (X.screens.find(z => z.kind === "take") || {}).moment.line, take1: v.t1 || "", take2: v.t2 || "" }), res => { v[`ai${i}_note`] = res.note; }, { req: ["take1", "take2"], rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` })}`;
      ok = sc.checks.every((_, k) => v["c" + k]);
    }
    if (K === "summary") {
      const row = (l, t) => t ? `<div class="sm-row"><small>${esc(l)}</small><span>${t}</span></div>` : "";
      if (X.key === "l1") h += row("Your moment", q(v.what)) + row("The gap", esc((v.gaps || []).map(k => ACTS.GAP[k]).join(" + "))) + row("Your action this week", esc(v.action)) + `<p class="act-done">✓ Saved to your Clinical Confidence Profile.</p>`;
      if (X.key === "l2") h += row("First thought", q(v.thought)) + row("Tempted to", esc(v.urge)) + row("Where you feel it", esc(v.body)) + row("Your reset", esc(v.reset)) + row("Your words", q(v.r2)) + `<p class="act-done">✓ Saved to your Clinical Confidence Profile.</p><div class="live-cta"><span class="live-eyebrow">✦ Take it live</span><b>Now try it with a client who reacts to your exact words.</b><span>Ten moments with Dana, a training note after each answer, and a summary at the end.</span><button type="button" class="v6-btn primary" data-go="live">Start a live session →</button></div>`;
      if (X.key === "l3") h += row("Take 1 · instinct", q(v.t1)) + row("Take 2 · P.A.U.S.E.", q(v.t2)) + row("Take 3 · your voice", q(v.t3)) + row("The limit", "When safety comes up, safety comes first.") + `<p class="act-done">✓ Saved to your Profile’s “What I Say When…” lines.</p>`;
    }
    return { h, ok };
  }
  function actView(key) {
    const X = ACTS[key];
    if (!X) return weekView();
    const st = ACT(key), n = X.screens.length, i = Math.min(st.i, n - 1), last = i === n - 1;
    const { h, ok } = actScreen(X, i, st.v);
    const wi = D.WEEK1.findIndex(s => s.key === key), nx = D.WEEK1[wi + 1];
    const back = i ? `<button type="button" class="v6-btn secondary" data-anav="-1">← Back</button>` : `<button type="button" class="v6-btn secondary" data-go="week/${key}">← Lesson</button>`;
    const fwd = last ? `<span class="act-end"><button type="button" class="v6-btn secondary" data-anav="again">↺ Do it again</button>${nx ? `<button type="button" class="v6-btn primary next" data-go="week/${nx.key}">Next: ${esc(nx.short)} →</button>` : ""}</span>`
      : `<button type="button" class="v6-btn primary" data-anav="1"${ok ? "" : " disabled"}>${i === n - 2 ? "Finish ✓" : "Next →"}</button>`;
    const html = `<div class="act look-${X.look}"><div class="act-top"><span class="act-name">${esc(X.name)}</span><span class="act-count">${i + 1} of ${n}</span></div>
      <div class="act-prog" aria-hidden="true"><span style="width:${((i + 1) / n) * 100}%"></span></div>
      <div class="act-body">${h}</div>
      ${i === 0 ? `<div class="fiction">Fictional practice. Never enter real client details.</div>` : ""}
      <div class="actions act-nav">${back}${fwd}</div></div>`;
    return { html, title: X.name, plain: true, sub: `Lesson ${key.slice(1)} practice`, crumb: ["Week 1", X.name, "week/" + key], solo: true, tight: true };
  }

  /* ---------- Short AI assists inside activities (lab-ai-assist function) ----------
     aiBox() renders a button (or auto-runs), then the result: an optional client reply bubble and a training note.
     Results are kept per spot and re-asked only if the student's words changed. `save` mirrors results into the
     activity's own state so they're logged to Airtable with everything else. */
  const AIREQ = {}, AIBUSY = {}, RATE = {};
  /* Thumbs up / down under every practice-partner reply. Saved in S.fb and logged to Airtable "AI Feedback". */
  function rateHTML(fbid, meta) {
    RATE[fbid] = meta;
    const f = (S.fb || {})[fbid] || {};
    return `<div class="rate" data-rate-row="${fbid}"><span>Was this helpful?</span>
      <button type="button" class="rate-b${f.rating === "up" ? " on" : ""}" data-rate="${fbid}" data-val="up" aria-pressed="${f.rating === "up"}" aria-label="Helpful">👍</button>
      <button type="button" class="rate-b${f.rating === "down" ? " on" : ""}" data-rate="${fbid}" data-val="down" aria-pressed="${f.rating === "down"}" aria-label="Not helpful or not accurate">👎</button>
      ${f.rating === "up" ? `<em>Thanks!</em>` : ""}
      ${f.rating === "down" ? `<span class="rate-off"><input class="v6-in" type="text" data-rate-note="${fbid}" value="${esc(f.note || "")}" placeholder="What was off? (optional)"><em>${f.note ? "Saved. Thank you." : "Thanks for telling us."}</em></span>` : ""}</div>`;
  }
  function bindRate() {
    $$("[data-rate]").forEach(b => b.onclick = () => {
      const id = b.dataset.rate, v = b.dataset.val; S.fb = S.fb || {};
      const prev = S.fb[id] || {};
      S.fb[id] = { ...prev, ...RATE[id], rating: prev.rating === v ? "" : v, at: new Date().toISOString() };
      save(); render();
    });
    $$("[data-rate-note]").forEach(t => { t.oninput = () => { const id = t.dataset.rateNote; S.fb[id] = { ...(S.fb[id] || {}), note: t.value.slice(0, 600), at: new Date().toISOString() }; save(); const em = t.nextElementSibling; if (em) em.textContent = t.value.trim() ? "Saved. Thank you." : "Thanks for telling us."; clearTimeout(t._lt); t._lt = setTimeout(logTick, 800); }; });
  }
  const aiSig = d => JSON.stringify(d);
  function aiBox(id, label, task, dataFn, save, o = {}) {
    AIREQ[id] = { task, dataFn, save, auto: !!o.auto, req: o.req || [] };
    S.ai = S.ai || {};
    const data = dataFn(), r = S.ai[id], fresh = !!(r && r.sig === aiSig(data) && r.res), ready = true;
    let h = `<div class="ai-box${o.cls ? " " + o.cls : ""}">`;
    if (fresh) {
      const res = r.res;
      if (res.client) h += `<div class="lv-client"><span class="lv-av" aria-hidden="true">${esc((o.who || "C")[0])}</span><div class="lv-say">${q(res.client)}</div></div>`;
      if (res.note) h += `<div class="lv-note${res.safety ? " safety" : ""}"><span class="lv-tag">${res.safety ? "Pause" : "✦ Training note"}</span>${esc(res.note)}</div>`;
      if (!res.safety && o.rkey) h += rateHTML(`${id}@${r.at || ""}`, { rkey: o.rkey, akeys: o.akeys || [], where: o.where || label, type: res.client ? "Client reply" : "Training note", ai: [res.client && `Client: ${res.client}`, res.note && `Training note: ${res.note}`].filter(Boolean).join("\n"), input: data.response || data.action || data.take2 || data.sentence || "" });
    }
    if (AIBUSY[id]) h += `<div class="lv-wait" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(o.wait || "Processing…")}</div>`;
    else if (!fresh) h += `<button type="button" class="ai-btn" data-ai="${id}"${ready ? "" : " disabled"}><span class="ai-spark" aria-hidden="true">✦</span><span><b>${esc(label)}</b><small>${ready ? (o.sub || "Responds to your exact words") : (o.need || "Write your answer first")}</small></span></button>`;
    else h += `<button type="button" class="v6-link ai-again" data-ai="${id}">↺ Ask again</button>`;
    if (r && r.err && !fresh && !AIBUSY[id]) h += `<div class="lv-err">${esc(r.err)}</div>`;
    return h + `</div>`;
  }
  async function aiRun(id) {
    const R = AIREQ[id]; if (!R || AIBUSY[id]) return;
    S.ai = S.ai || {};
    const data = R.dataFn();
    if (R.req.some(k => !String(data[k] || "").trim())) { S.ai[id] = { ...(S.ai[id] || {}), err: "Write your answer first, then ask." }; render(); return; }
    R.data = data; AIBUSY[id] = true; render();
    try {
      const res = await fetch("/.netlify/functions/lab-ai-assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: R.task, data: R.data }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "This isn’t available right now. Try again in a moment.");
      S.ai[id] = { sig: aiSig(R.data), res: { client: out.client || "", note: out.note || "", safety: !!out.safety }, at: new Date().toISOString() };
      if (R.save) R.save(S.ai[id].res);
    } catch (e) { S.ai[id] = { ...(S.ai[id] || {}), err: e.message || "Something went wrong. Try again." }; }
    AIBUSY[id] = false; save(); render();
  }
  function bindAI() {
    $$("[data-ai]").forEach(b => b.onclick = () => aiRun(b.dataset.ai));
    bindRate();
    Object.entries(AIREQ).forEach(([id, R]) => { const r = (S.ai || {})[id]; if (R.auto && !AIBUSY[id] && !(r && r.sig === aiSig(R.dataFn()) && (r.res || r.err)) && document.querySelector(`[data-ai="${id}"]`)) setTimeout(() => aiRun(id), 50); });
  }

  /* ---------- AI live session: Dana (lab-live-session function) ----------
     Flow per moment: Dana speaks -> trainee attempt -> Training note (Dana hasn't reacted yet)
       -> Refine (same moment, 3 per session) or Continue (Dana reacts; that's the next moment). 10 moments, then wrap-up.
     The shared preview login is a test account: counts are shown but never enforced. */
  const LIVE = { url: "/.netlify/functions/lab-live-session", moments: 10, refines: 3, perDay: 3, busy: false, err: "" };
  /* Daily allowance: live sessions started in the last 24 hours (rolling). Test account: shown, not enforced. */
  const liveUses = () => { const L = liveState(), now = Date.now(); L.starts = (L.starts || []).filter(t => now - t < 864e5); return L.starts; };
  const liveResetIn = () => { const u = liveUses(); if (!u.length) return ""; const ms = Math.max(0, Math.min(...u) + 864e5 - Date.now()), h = Math.floor(ms / 36e5), m = Math.ceil((ms % 36e5) / 6e4); return h ? `${h}h ${m}m` : `${m}m`; };
  const LIVE_OPEN = "Honestly? I think you don’t understand me either. Everyone just keeps giving me homework.";
  const isTestAccount = () => true; /* every current login is the shared preview account; real Supabase students will be limited */
  const liveState = () => (S.live = S.live || { past: [], cur: null });
  const liveNew = () => ({ id: Math.random().toString(36).slice(2, 9), started: new Date().toISOString(), moments: [{ client: LIVE_OPEN }], refinesUsed: 0, phase: "attempt", done: false });
  async function liveCall(mode, sess) {
    const res = await fetch(LIVE.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "dana", mode, moments: sess.moments.map(m => ({ client: m.client, attempts: (m.attempts || []).map(a => ({ text: a.text, note: a.note || "" })) })) }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "The practice partner is unavailable right now.");
    if (mode !== "wrap" && !String(out.text || "").trim()) throw new Error("That didn’t come through. Tap Try again.");
    return out;
  }
  function liveView() {
    const L = liveState(), C = L.cur;
    const intro = `<div class="live-intro">
        <span class="live-eyebrow">✦ Live session · Practice partner</span>
        <h2>Sit with Dana for ten moments.</h2>
        <p>Dana is a fictional client, six sessions in and a little guarded today. Respond the way you would in the room. Before she reacts, you’ll get a training note to help you slow down and look again. Then it’s your call.</p>
        <ol class="live-how"><li><span><b>Dana talks</b>You respond in your own words.</span></li><li><span><b>You get a training note</b>What your response might invite, and a question to sit with. You find the next move.</span></li><li><span><b>You decide</b>Refine your answer (3 per session) or hear how Dana responds.</span></li><li><span><b>Ten moments</b>Then a summary of where the session opened up, and where it closed.</span></li></ol>
        <div class="live-meta"><span>About 15 minutes</span><span>Fictional practice only</span><span>A training tool for The Confident Clinician</span></div>
        ${(() => { const used = liveUses().length, left = Math.max(0, LIVE.perDay - used), test = isTestAccount(), blocked = !left && !test;
          return `<div class="live-allow"><b>${left} of ${LIVE.perDay} sessions left today</b>${used ? `<span>${left ? "One more opens" : "Your next session opens"} in ${liveResetIn()}</span>` : `<span>Sessions reset every 24 hours</span>`}${test && !left ? `<span>Test account: keep going</span>` : ""}</div>
            <button type="button" class="v6-btn primary live-go" data-live="start"${blocked ? " disabled" : ""}>${blocked ? `Next session opens in ${liveResetIn()}` : "Start the session"}</button>`; })()}
        ${L.past.filter(p => p.done).length ? `<p class="live-past">You’ve finished ${L.past.filter(p => p.done).length} session${L.past.filter(p => p.done).length > 1 ? "s" : ""}. <button type="button" class="v6-link" data-live="lastsum">See your last summary</button></p>` : ""}
      </div>`;
    if (!C || L.showIntro) return { html: `<div class="live">${intro}</div>`, title: "Live session", plain: true, sub: "A practice partner who reacts to your exact words.", crumb: ["Practice", "Live session", "reproom"], solo: true, tight: true };
    /* repair: a blank client line (from an earlier failed reply) is removed so they can ask again */
    while (C.moments.length > 1 && !String(C.moments[C.moments.length - 1].client || "").trim()) { C.moments.pop(); C.phase = "choose"; }
    C.moments.forEach(m => (m.attempts || []).forEach(a => { if (a.note === "") delete a.note; }));
    { const lm = C.moments[C.moments.length - 1], la = (lm.attempts || []).slice(-1)[0]; if (C.phase === "choose" && la && !la.note && !LIVE.busy) { C.phase = "attempt"; lm.attempts.pop(); C.draft = la.text; } }
    const n = C.moments.length, test = isTestAccount(), left = LIVE.refines - C.refinesUsed;
    const allS = [...L.past, ...(L.past.some(p => p.id === C.id) ? [] : [C])], rkey = `live-dana#${allS.findIndex(p => p.id === C.id) + 1}`;
    const moment = (m, k) => {
      const last = k === n - 1;
      const atts = (m.attempts || []).map((a, j, all) => {
        const old = j < all.length - 1;
        return `<div class="lv-me${old ? " old" : ""}"><span class="lv-tag">${old ? "↺ Refined" : all.length > 1 ? `Attempt ${j + 1}` : "You"}</span>${esc(a.text)}</div>`
          + (a.note ? `<div class="lv-note${a.safety ? " safety" : ""}${old ? " old" : ""}"><span class="lv-tag">${a.safety ? "Pause" : "Training note"}</span>${esc(a.note)}</div>${a.safety ? "" : rateHTML(`live-${C.id}-m${k}-a${j}`, { rkey, akeys: [`m${k}a${j}`], where: `Live session · Moment ${k + 1} · Training note`, type: "Training note", ai: a.note, input: a.text })}` : "");
      }).join("");
      const prevA = k ? ((C.moments[k - 1].attempts || []).slice(-1)[0] || {}).text || "" : "";
      return `<div class="lv-moment${last ? " now" : ""}"><span class="lv-mn">Moment ${k + 1}</span><div class="lv-client"><span class="lv-av" aria-hidden="true">D</span><div class="lv-say">${q(m.client)}</div></div>${k ? rateHTML(`live-${C.id}-c${k}`, { rkey, akeys: [(m.attempts || []).length ? `m${k}a0` : `m${k - 1}a${Math.max(0, (C.moments[k - 1].attempts || []).length - 1)}`], where: `Live session · Moment ${k + 1} · Dana`, type: "Client reply", ai: m.client, input: prevA }) : ""}${atts}</div>`;
    };
    const curM = C.moments[n - 1], lastA = (curM.attempts || []).slice(-1)[0];
    let ctl = "";
    if (C.done) {
      ctl = `${C.closing ? `<div class="lv-client"><span class="lv-av" aria-hidden="true">D</span><div class="lv-say">${q(C.closing)}</div></div>` : ""}
        <div class="lv-summary"><span class="lv-tag">Session summary</span>${esc(C.summary || "").split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join("")}</div>
        ${rateHTML(`live-${C.id}-sum`, { rkey, akeys: ["summary"], where: "Live session · Session summary", type: "Session summary", ai: [C.closing && `Dana: ${C.closing}`, C.summary].filter(Boolean).join("\n"), input: "" })}
        <div class="actions"><button type="button" class="v6-btn primary" data-live="new">Start a new session</button><button type="button" class="v6-btn secondary" data-go="reproom">Back to practice</button></div>`;
    } else if (LIVE.busy) {
      ctl = `<div class="lv-wait" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${LIVE.busy === "note" ? "Processing…" : LIVE.busy === "wrap" ? "Wrapping up the session…" : "Dana is responding…"}</div>`;
    } else if (C.phase === "attempt") {
      ctl = `<label class="lv-input"><span>What do you say to Dana?</span><textarea class="v6-ta" rows="3" data-live-text placeholder="Type it the way you’d say it in the room">${esc(C.draft || "")}</textarea></label>
        <div class="actions"><button type="button" class="v6-btn primary" data-live="send"${(C.draft || "").trim().length >= 2 ? "" : " disabled"}>Send my response</button>${lastA && lastA.note && C.refining ? `<button type="button" class="v6-btn secondary" data-live="cancelrefine">Keep my last answer</button>` : ""}</div>`;
    } else if (C.phase === "choose") {
      const canRefine = left > 0 || test;
      ctl = `<div class="lv-choose">
          <button type="button" class="lv-btn refine" data-live="refine"${canRefine && !lastA.safety ? "" : " disabled"}><b>↺ Refine my answer</b><small>${left > 0 ? `${left} refine${left === 1 ? "" : "s"} left` : test ? "0 left · test account, keep going" : "No refines left"}</small></button>
          <button type="button" class="lv-btn go" data-live="continue"${lastA.safety ? " disabled" : ""}><b>${n >= LIVE.moments ? "End the session →" : "Hear Dana’s response →"}</b><small>${n >= LIVE.moments ? "Get your session summary" : `Moment ${n + 1} of ${LIVE.moments} next`}</small></button>
        </div>${lastA.safety ? `<div class="actions"><button type="button" class="v6-btn secondary" data-live="new">Start over</button></div>` : ""}`;
    }
    const html = `<div class="live in-session">
      <div class="live-head"><div><span class="live-eyebrow">✦ Live session · Practice partner</span><span class="lv-who">Dana, 34 · ER nurse · Session 6</span></div>
        <div class="lv-stats"><span>${C.done ? "Session complete" : `Moment ${n} of ${LIVE.moments}`}</span><span>Refines left: ${Math.max(0, left)}${test && left <= 0 ? " · test" : ""}</span></div>
        <div class="lv-prog" aria-hidden="true"><span style="width:${(C.done ? 1 : n / LIVE.moments) * 100}%"></span></div></div>
      <div class="live-feed">${C.moments.map(moment).join("")}${LIVE.err ? `<div class="lv-err">${esc(LIVE.err)} <button type="button" class="v6-link" data-live="retry">Try again</button></div>` : ""}${ctl}</div>
      <div class="live-foot">Fictional practice. Never use real client details. ${test ? "Test account: limits are shown but not enforced." : ""} <button type="button" class="v6-link" data-live="quit">Leave session</button></div></div>`;
    return { html, title: "Live session", plain: true, sub: "A practice partner who reacts to your exact words.", crumb: ["Practice", "Live session", "reproom"], solo: true, tight: true };
  }
  async function liveStep(kind) {
    const L = liveState(), C = L.cur; LIVE.err = ""; LIVE.retry = kind;
    try {
      if (kind === "note") {
        LIVE.busy = "note"; render();
        const a = C.moments[C.moments.length - 1].attempts.slice(-1)[0], out = await liveCall("note", C);
        a.note = out.text; if (out.safety) a.safety = true; C.phase = "choose";
      } else if (kind === "client") {
        LIVE.busy = "client"; render();
        const out = await liveCall("client", C);
        if (out.safety) { C.moments[C.moments.length - 1].attempts.slice(-1)[0].note = out.text; C.moments[C.moments.length - 1].attempts.slice(-1)[0].safety = true; C.phase = "choose"; }
        else { C.moments.push({ client: out.text }); C.phase = "attempt"; C.draft = ""; }
      } else if (kind === "wrap") {
        LIVE.busy = "wrap"; render();
        const out = await liveCall("wrap", C);
        C.closing = out.closing || ""; C.summary = out.summary || out.text || ""; C.done = true; C.ended = new Date().toISOString();
        L.past.push(C);
      }
    } catch (e) { LIVE.err = e.message || "Something went wrong."; }
    LIVE.busy = false; save(); render();
    const f = $(".live-feed"); if (f) { const last = f.lastElementChild; if (last) last.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  /* ---------- Rep Room ---------- */
  let chip = "open";
  function roomView() {
    const all = D.REPS.map(r => {
      const open = weekOpen(r.week), x = S.reps[r.id], practiced = !!(x && x.saved);
      return { r, open, practiced, n: x ? x.attempts.length + (x.saved ? 1 : 0) : 0 };
    });
    const list = all.filter(c => chip === "all" || (chip === "done" ? c.practiced : c.open));
    const html = `<div class="live-cta wide"><span class="live-eyebrow">✦ New · Live session</span><b>Practice with a client who reacts to your exact words.</b><span>Ten moments with Dana. A training note after each answer, then you choose: refine or hear her response.</span><button type="button" class="v6-btn primary" data-go="live">Start a live session →</button></div>
      <div class="chips-row">${[["open", "Open now"], ["done", "Practiced"], ["all", "All 12 Reps"]].map(([k, l]) => `<button type="button" class="chip" data-chip="${k}" aria-pressed="${chip === k}">${l}</button>`).join("")}</div>
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
        <div class="words pull"><span class="t">The Pull</span><span class="d">The automatic urge that grabs you under pressure.</span><div class="chips">${D.PULLS.map(([t, d]) => `<span title="${esc(d)}">${esc(t)}</span>`).join("")}</div></div>
        <div class="words pause-c"><span class="t">P.A.U.S.E.</span><span class="d">Your way back in when you go blank.</span><div class="pause">${D.PAUSE.map(([l, t]) => `<span><b>${l}</b> · ${esc(t)}</span>`).join("")}</div></div>
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
      const aim = a && D.AIMS.find(x => x[0] === a.aim);
      const words = a && (a.move || "").trim() ? `<span class="said">${q(a.move.trim())}</span>${aim ? `<span class="aimed">Going for: <b>${esc(aim[2])}</b></span>` : ""}` : "";
      const day1 = S.sealed && words ? `<span class="slot ok"><span class="lbl">Day 1 · your words</span>${words}</span>`
        : a && a.aim ? `<span class="slot"><span class="lbl">Day 1 · your words</span>${words}<span class="aimed">Not sealed yet. Finish Day 1 to lock it in.</span></span>`
        : `<span class="slot" style="color:var(--muted)"><span class="lbl">Day 1 · your words</span>Not answered yet. You’ll answer this on Day 1.</span>`;
      return `<div class="card stack-12 growth-card" style="gap:14px"><div class="growth-top"><span class="col"><span class="who">${esc(b.who)}</span><span class="line">${q(b.line)}</span></span><span class="v6-pill sage">${b.id} · ${esc(b.skill)}</span></div>
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
        if (act === "demowatch") { S.demo.watched = !S.demo.watched; }
        if (act === "demosave") { S.steps.demo = true; save(); render(); flash("Saved"); return; }
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
      $$("[data-demo]", app).forEach(t => t.oninput = () => { S.demo[t.dataset.demo] = t.value; save(); const b = $("[data-act=demosave]", app); if (b) b.disabled = !(S.demo.watched && (S.demo.line || "").trim().length >= 3 && (S.demo.why || "").trim().length >= 3 && S.demo.ck); });
      $$("[data-demo-ck]", app).forEach(b => b.onclick = () => { S.demo.ck = b.dataset.demoCk; save(); render(); });
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
      const rfu = $("[data-rf-useline]", app); if (rfu) rfu.onclick = () => { const x = S.reps[String(F.rep).replace("rep:", "")]; if (x) { x.line = F.redoLine; x.saved = true; } save(); render(); flash("Playbook updated"); };
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
    if (scr === "live") {
      const L = liveState();
      const t = $("[data-live-text]", app);
      if (t) { t.oninput = () => { L.cur.draft = t.value; save(); const b = $('[data-live="send"]', app); if (b) b.disabled = t.value.trim().length < 2; }; if (!LIVE.busy) t.focus({ preventScroll: true }); }
      bindRate();
      $$("[data-live]", app).forEach(b => b.onclick = () => {
        const d = b.dataset.live, C = L.cur;
        if (d === "start" || d === "new") {
          if (!isTestAccount() && liveUses().length >= LIVE.perDay) { L.cur = null; L.showIntro = true; save(); render(); return; }
          if (d === "new") { L.showIntro = true; if (L.cur && !L.past.some(p => p.id === L.cur.id)) L.past.push(L.cur); L.cur = null; save(); render(); scrollTo({ top: 0 }); return; }
          liveUses().push(Date.now());
          if (L.cur && !L.past.some(p => p.id === L.cur.id)) L.past.push(L.cur); L.cur = liveNew(); L.showIntro = false; LIVE.err = ""; save(); render(); scrollTo({ top: 0 }); return; }
        if (d === "lastsum") { L.cur = L.past.filter(p => p.done).slice(-1)[0] || L.cur; L.showIntro = false; save(); render(); return; }
        if (d === "quit") { if (C && !C.done) { C.left = true; } L.showIntro = true; save(); render(); scrollTo({ top: 0 }); return; }
        if (!C) return;
        if (d === "send") { const txt = (C.draft || "").trim(); if (txt.length < 2) return; const m = C.moments[C.moments.length - 1]; (m.attempts = m.attempts || []).push({ text: txt.slice(0, 1200), at: new Date().toISOString() }); C.draft = ""; C.refining = false; save(); liveStep("note"); return; }
        if (d === "refine") { C.refinesUsed++; C.phase = "attempt"; C.refining = true; C.draft = ""; save(); render(); return; }
        if (d === "cancelrefine") { C.refinesUsed = Math.max(0, C.refinesUsed - 1); C.phase = "choose"; C.refining = false; save(); render(); return; }
        if (d === "continue") { liveStep(C.moments.length >= LIVE.moments ? "wrap" : "client"); return; }
        if (d === "retry") { liveStep(LIVE.retry || "note"); return; }
      });
    }
    if (scr === "act") {
      const st = ACT(arg), X = ACTS[arg], v = st.v;
      if (!X) return;
      $$("[data-av]", app).forEach(b => b.onclick = () => { v[b.dataset.f] = b.dataset.av; save(); render(); });
      $$("[data-mv]", app).forEach(b => b.onclick = () => { const f = b.dataset.f; if (v[f + "c"]) return; const g = v[f] = v[f] || [], k = b.dataset.mv; const at = g.indexOf(k); at === -1 ? g.push(k) : g.splice(at, 1); save(); render(); });
      $$("[data-mcheck]", app).forEach(b => b.onclick = () => { v[b.dataset.mcheck] = true; save(); render(); });
      $$("[data-gapt]", app).forEach(b => b.onclick = () => { const g = v.gaps = v.gaps || [], k = b.dataset.gapt; const at = g.indexOf(k); at === -1 ? g.push(k) : g.splice(at, 1); save(); render(); });
      $$("[data-at]", app).forEach(t => t.oninput = () => {
        v[t.dataset.at] = t.value; save();
        const { ok } = actScreen(X, Math.min(st.i, X.screens.length - 1), v);
        const nb = $('[data-anav="1"]', app); if (nb) nb.disabled = !ok;
      });
      $$("[data-anav]", app).forEach(b => b.onclick = () => {
        const d = b.dataset.anav;
        if (d === "again") { S.act[arg] = { i: 0, v: {}, done: true, n: (st.n || 1) + 1 }; }
        else { st.i = Math.max(0, Math.min(X.screens.length - 1, st.i + +d)); if (st.i === X.screens.length - 1) st.done = true; }
        save(); render(); scrollTo({ top: 0 });
      });
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
      $$("[data-mypull]", app).forEach(b => b.onclick = () => { x.pull = x.pull === b.dataset.mypull ? null : b.dataset.mypull; save(); render(); });
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
  $$("[data-back]").forEach(b => b.onclick = goBack);
  $$("[data-menu]").forEach(b => b.onclick = () => setMenu(!$(".v6-app").classList.contains("menu-open")));
  $$("[data-menu-close]").forEach(b => b.onclick = () => setMenu(false));
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
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
