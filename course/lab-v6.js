/* Clinical Confidence Lab v6 "Workspace" student experience.
   Screens: sign in, Home, My week, Rep, Day 1 Baseline, Rep Room, Playbook, My growth.
   Data and copy live in lab-v6-data.js. Learner work is saved in this browser (localStorage) and to the student's account
   (lab-progress function, Airtable "Saved Progress"), so it follows them to any device. */
(function () {
  /* ---------- One sound at a time ----------
     Whenever any audio starts (a Demo clip, a Rep, the voice session, a recording), anything else that was playing stops,
     including a lesson video. A stopped clip counts as finished, so its button doesn't get stuck on "Playing…". */
  (() => {
    const P = HTMLMediaElement.prototype, orig = P.play;
    let cur = null;
    const stopVideos = () => { try { (window.Wistia && Wistia.api && Wistia.api.all ? Wistia.api.all() : []).forEach(v => { if (v.state && v.state() === "playing") v.pause(); }); } catch (e) {} };
    const stopCur = except => { if (cur && cur !== except && !cur.paused) { const old = cur; old.pause(); old.dispatchEvent(new Event("ended")); } };
    P.play = function () { stopCur(this); stopVideos(); cur = this; return orig.apply(this, arguments); };
    window._wq = window._wq || [];
    window._wq.push({ id: "_all", onReady: v => v.bind("play", () => { stopCur(null); try { Wistia.api.all().forEach(o => { if (o !== v && o.state() === "playing") o.pause(); }); } catch (e) {} }) });
  })();

  const D = window.TCC6;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const q = t => `“${esc(t)}”`;

  /* Preview sign-in: the same client-side test gate as the existing Lab preview. Not real authentication. */
  const PREVIEW_SESSION = "tccLabStudentPreview"; /* older preview flag, still honored */
  const SESSION = "tccLabSession"; /* { email, first, test } for this browser tab */
  const session = () => { try { const s = JSON.parse(sessionStorage.getItem(SESSION) || "null"); if (s && s.email && s.token) return s; } catch (e) {} return null; };
  /* Every call to the server carries the signed sign-in token; the server checks it and the daily limits. */
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${(session() || {}).token || ""}` });
  let signedOutMsg = "";
  const signedOut = () => { sessionStorage.removeItem(SESSION); sessionStorage.removeItem(PREVIEW_SESSION); signedOutMsg = "For your security, please sign in again."; render(); };
  async function api(url, payload, opts = {}) {
    const res = await fetch(url, { method: "POST", headers: authHeaders(), body: typeof payload === "string" ? payload : JSON.stringify(payload), ...opts });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401 && out.auth) { signedOut(); throw new Error("Please sign in again."); }
    return { res, out };
  }
  const PREVIEW_EMAIL = "studentpreview@theconfidentclinician.me";

  const BASE_KEY = "tcc-v6-v2";
  /* Real students get their own saved progress, so two people on one computer never mix. The preview account keeps the original key. */
  const keyFor = s => (!s || s.test) ? BASE_KEY : `${BASE_KEY}:${s.email}`;
  let KEY = keyFor(session());
  const blank = () => ({ welcome: false, base: {}, baseIdx: 0, sealed: false, watched: {}, reps: {}, steps: {}, reflect: {}, profile: {}, lab: {}, sim: { v: 3 }, act: {}, demo: {}, reviewer: false });
  let S = blank();
  const loadS = () => { S = blank(); try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage unavailable */ } };
  /* One-time cleanups when an activity's content changes. Run after loading from this browser or from the account. */
  const migrate = () => {
    if (!S.sim || S.sim.v !== 3) S.sim = { v: 3 };
    if (S.actV !== 2) { S.act = {}; S.actV = 2; }
    if (S.actL3 !== 4) { if (S.act) delete S.act.l3; S.actL3 = 4; }
    if (S.act && S.act.l3 && S.act.l3.v && S.actL3c !== 2) { ["c0", "c1", "c2", "c3", "c4", "c5"].forEach(k => delete S.act.l3.v[k]); S.actL3c = 2; } /* side-by-side questions: one per P.A.U.S.E. letter + takeaway */ /* Two Takes restructured */ /* activities rewritten (harder versions): start them fresh */ /* simulation content changed (8-moment text simulations): start it fresh */
    if (S.labV !== 5) { S.lab = {}; S.labV = 5; } /* Lab Spot It + Said or assumed? redesigned */
  };
  loadS(); migrate();
  /* Progress is saved in this browser AND to the student's account (lab-progress function), so it follows them to any device.
     S._t is when the student last changed anything; the newest copy always wins. */
  const sig = () => JSON.stringify(S, (k, v) => (k === "_t" ? undefined : v));
  const SYNC = { pulled: false, busy: false, again: false, timer: null, loadT: S._t || 0, sig: sig(), lastPull: 0 };
  const save = () => {
    if (!S.start && anyProgress()) S.start = Date.now();
    const g = sig();
    if (g !== SYNC.sig) { SYNC.sig = g; S._t = Date.now(); syncSoon(); }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  };
  const PROGRESS_URL = "/.netlify/functions/lab-progress";
  function syncSoon() { if (!session()) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(() => { SYNC.timer = null; syncSend(); }, 1500); }
  function adopt(state, t) {
    S = Object.assign(blank(), state || {}); migrate(); S._t = t; SYNC.sig = sig(); SYNC.loadT = t;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    /* never redraw the page in the middle of a Demo clip: that cuts the sound off */
    if (d2Cur && !d2Cur.paused) { const a = d2Cur; a.addEventListener("ended", () => setTimeout(render, 350), { once: true }); return; }
    render();
  }
  async function syncSend(keep) {
    if (!session()) return;
    if (!SYNC.pulled || SYNC.busy) { SYNC.again = true; return; }
    SYNC.busy = true;
    try {
      const { res, out } = await api(PROGRESS_URL, { action: "save", state: S, t: S._t || Date.now() }, keep ? { keepalive: true } : {});
      if (res.ok && out.stale && out.state) adopt(out.state, out.t);
    } catch (e) { /* offline: it stays saved in this browser and goes up with the next change */ }
    finally { SYNC.busy = false; if (SYNC.again) { SYNC.again = false; syncSoon(); } }
  }
  async function syncPull() {
    if (!session() || SYNC.busy) return;
    SYNC.lastPull = Date.now();
    try {
      const { res, out } = await api(PROGRESS_URL, { action: "load" });
      if (!res.ok || !out.ok) throw new Error("load failed");
      SYNC.pulled = true;
      const mine = SYNC.loadT ? (S._t || 0) : 0; /* a browser that never saved anything takes the account's copy */
      if (out.state && out.t > mine) adopt(out.state, out.t);
      else if (!out.state && anyProgress()) { S._t = S._t || Date.now(); syncSend(); } /* first time on the account: send up what this browser already has */
      else if (out.state && (S._t || 0) > (out.t || 0)) syncSend();
      if (SYNC.again) { SYNC.again = false; syncSoon(); }
    } catch (e) { setTimeout(syncPull, 20000); }
  }
  const loadAll = () => { loadS(); migrate(); SYNC.pulled = false; SYNC.loadT = S._t || 0; SYNC.sig = sig(); syncPull(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && SYNC.pulled && !SYNC.timer && Date.now() - SYNC.lastPull > 15000) syncPull(); });
  addEventListener("pagehide", () => { if (SYNC.timer) { clearTimeout(SYNC.timer); SYNC.timer = null; syncSend(true); } });

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
  const weekOpen = n => n === 1 || S.reviewer || isTestAccount() || (weekDone(n - 1) && timeReached(n));
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
  let lastSig = "";
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
  const logEmail = () => (session() || {}).email || "studentpreview@theconfidentclinician.me"; /* the signed-in student's email */
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
      if (sc.kind === "reflect") { sc.items.forEach(([k, qq]) => add(k, `${T} · ${qq}`, v[k])); add("r2", `${T} · Adjusted response`, v.r2); }
      if (sc.kind === "take") add(`t${sc.n}`, T, v[`t${sc.n}`]);
      if (sc.kind === "follow") { add("her", `${T} · She said`, v.her); add("t4", `${T} · Your next move`, v.t4); if (v[`ai${i}b_note`]) add(`ai${i}b_note`, `${T} · AI training note (next move)`, v[`ai${i}b_note`]); }
      if (sc.kind === "pausewalk") sc.steps.forEach(([l, nm, , , key]) => add(key || l, `${T} · ${nm}`, v[key || l]));
      if (sc.kind === "compare") sc.qs.forEach(([tag, qq], k) => add(`c${k}`, `${T} · ${tag}: ${qq}`, v[`c${k}`]));
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
    if (S.lab && Object.keys(S.lab).length) mk("lab", "The Clinical Blind Spot", D.LAB.who, 1, 1, S.steps.lab ? "Finished" : "In progress", flatPairs(S.lab));
    const M = S.sim || {}, SJ = SIMS.jordan;
    [...(M.history || []), M.cur].filter(Boolean).forEach((C, k) => mk("sim", "Imani Simulation", "Imani’s Secret", 1, k + 1, C.saved ? "Finished" : "In progress",
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
        const rec = { attemptId: `${logEmail()}|${R.key}|${S.logId}`, activityKey: R.akey, detail: R.detail, attemptNo: R.n, status: R.status, changed, matches, started: F._started, answers, feedback };
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
      const part = q.slice(k, k + 10), body = JSON.stringify({ email: logEmail(), source: logSource(), attempts: part.map(({ _sig, _key, ...r }) => r) });
      try {
        if (!session()) continue;
        const res = await fetch(LOG.url, { method: "POST", headers: authHeaders(), body, keepalive: true });
        if (res.ok) { part.forEach(r => { S.logSent[r._key] = r._sig; }); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
      } catch (e) { /* offline or not configured: retry on the next change */ }
    }
    LOG.busy = false;
  }
  addEventListener("pagehide", () => { if ((LOG.queue || []).length) logSend(true); });

  function render() {
    const signedIn = !!session();
    $("[data-login]").hidden = signedIn;
    $("[data-app]").hidden = !signedIn;
    if (!signedIn) { if (signedOutMsg) $("[data-login-error]").textContent = signedOutMsg; return; }
    const { scr, arg } = route();
    const h = location.hash.slice(1) || "home";
    if (goingBack) goingBack = false; else if (trail[trail.length - 1] !== h) trail.push(h);
    if (trail.length > 50) trail.splice(0, trail.length - 50);
    setMenu(false);
    $$("[data-back]").forEach(b => { b.hidden = scr === "home"; });
    const navKey = scr === "rep" || scr === "bonus" ? "reproom" : scr === "baseline" || scr === "act" ? "week" : scr;
    if (scr === "live" && liveState().cur && liveState().showIntro === undefined) liveState().showIntro = !!liveState().cur.done;
    const tabs = NAV.map(([k, label, short], i) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${i === -1 ? short : label}</button>`).join("");
    $("[data-tabs]").innerHTML = tabs;
    $("[data-bottom]").innerHTML = NAV.map(([k, , short]) => `<button type="button" data-go="${k}"${navKey === k ? ' aria-current="page"' : ""}>${short}</button>`).join("");
    if (!isTestAccount() && S.reviewer) S.reviewer = false;
    $$("[data-preview-toggle]").forEach(pv => { pv.hidden = !isTestAccount(); pv.textContent = S.reviewer ? "Preview · all open" : "Preview"; pv.classList.toggle("on", S.reviewer); pv.setAttribute("aria-pressed", S.reviewer); });

    const views = { home: homeView, week: weekView, act: actView, live: liveView, rep: repView, baseline: baselineView, reproom: roomView, bonus: bonusView, voice: voiceView, playbook: playbookView, growth: growthView };
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
    /* When "Next" moves to a new step inside the same exercise, the page often gets shorter and leaves you
       looking at the wrong spot. If the step counter changed, bring the top of the exercise back into view. */
    const sig = [...col.querySelectorAll(".act-count, .d2-prog, .lv-prog, .v6-pill, .v6-label, .fl-m")].map(e => e.textContent.trim()).join("|") + "#" + (location.hash || "");
    if (scr !== lastScr) scrollTo({ top: 0 });
    else if (sig !== lastSig) {
      const top = col.getBoundingClientRect().top + scrollY - 80;
      if (scrollY > top + 40) scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    lastScr = scr; lastSig = sig;
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
      + sec("practice", "Practice", "", item("reproom", "Rep Room", navKey === "reproom") + item("playbook", "Clinical Playbook", navKey === "playbook") + item("growth", "My growth", navKey === "growth"))
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
        <div class="w4-head"><h2><em>Four</em> weeks.</h2><p>Each week opens one week after the last, counted from the day you start. You’ll also need to finish each week before the next one opens.</p></div>
        <ol>${D.WEEKS.map(w => {
          const cur = w.n === 1, open = weekOpen(w.n);
          const status = cur ? (d ? `${d} of ${t} done` : "Open now") : weekStatus(w.n);
          return `<li class="${cur ? "cur" : ""}"><span class="n">0${w.n}</span><span class="tx"><b>${esc(w.title)}</b><small>${esc(w.theme)} · ${esc(w.question)}</small></span>${cur ? `<button type="button" class="v6-link" data-go="week">${status} →</button>` : `<em>${status}</em>`}</li>`;
        }).join("")}</ol>
      </section>
      <div class="pick">
        <h2>${anyProgress() ? "Pick up where you <em>left off.</em>" : "Everything else, <em>in one place.</em>"}</h2>
        <div class="pick-grid">${[
          ["playbook", D.IMG.b, "Clinical Playbook", "Your saved lines, your tools, and what you’re building each week.", "Open your Playbook"],
          ["reproom", D.IMG.a, "Rep Room", "Extra Reps in the same format. Never blocks your progress.", "Browse Reps"],
          ["growth", D.IMG.c, "My growth", "Your Day 1 answers. In Week 4, see how far you’ve come.", "See your growth"]
        ].map(([k, img, t2, d2, cta]) => `<button type="button" class="pick-card" data-go="${k}"><img src="${img}" alt=""><span class="pc"><small>${esc(t2)}</small><b>${esc(d2)}</b><span class="go">${esc(cta)} →</span></span></button>`).join("")}</div>
      </div>`;
    return { html, hero, solo: true };
  }

  /* ---------- My week ---------- */
  const video = (id, img, isVideo) => {
    const wid = id && D.VIDEOS[id];
    if (wid) return `<div class="media video"><iframe src="https://fast.wistia.net/embed/iframe/${esc(wid)}?seo=false" class="wistia_embed" name="wistia_embed" title="Lesson video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    return `<div class="media"><img src="${img}" alt="">${isVideo ? `<div class="play"><span aria-hidden="true">▶</span></div><span class="soon">Video coming soon</span>` : ""}</div>`;
  };
  const itemsHTML = (label, items) => `<div class="items"><div class="lab">${esc(label)}</div>${items.map(([k, a, b, done]) => `<div class="row"><span class="k${done ? " done" : ""}">${done ? "✓" : esc(k)}</span><span class="t"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ""}</span></div>`).join("")}</div>`;

  const howHTML = (title, steps, foot) => `<div class="how"><div class="how-h">${esc(title)}</div><ol>${steps.map(([t, d], i) => `<li><span class="num lg">${i + 1}</span><span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`).join("")}</ol>${foot ? `<div class="how-f">${esc(foot)}</div>` : ""}</div>`;
  /* ---------- Week 1 Lab: The Clinical Blind Spot ---------- */
  const LAB_STEPS = ["Spot It", "Said or assumed?", "The Pull", "Your move"];
  /* mode: "spot" (tap the client line the therapist missed) or false (read only) */
  const transcriptHTML = (L, mode) => `<ol class="transcript">${D.LAB.lines.map(([who, text, act], i) => {
    const n = i + 1, A = D.LAB;
    const cls = [who !== "Therapist" ? "client" : "ther", L.spotPick === n ? "picked" : "", L.spotPick === A.spot || (L.spotTries || 0) >= 2 ? (n === A.spot ? "spot" : n === A.turn ? "turn" : "") : ""].filter(Boolean).join(" ");
    const tag = L.spotPick && (L.spotPick === A.spot || (L.spotTries || 0) >= 2) ? (n === A.spot ? `<span class="lt clue">The clue</span>` : n === A.turn ? `<span class="lt miss">Where it slipped by</span>` : "") : "";
    const inner = `<span class="ln">${n}</span><span class="tx"><b>${who}</b>${q(text)}${act ? ` <i>(${esc(act)})</i>` : ""}${tag}</span>`;
    const can = mode === "spot" && who !== "Therapist";
    return `<li class="${cls}" data-ln="${n}">${can ? `<button type="button" data-lab-spot="${n}">${inner}</button>` : `<div>${inner}</div>`}</li>`;
  }).join("")}</ol>`;
  const chipsHTML = (attr, opts, cur, ans) => `<div class="chips-row">${opts.map(([k, l]) => `<button type="button" class="chip${cur === k && ans ? (k === ans ? " right" : " wrong") : ""}" ${attr}="${k}" aria-pressed="${cur === k}">${cur === k && k === ans ? "✓ " : ""}${esc(l)}</button>`).join("")}</div>`;
  const fb = (pick, ans, label) => pick ? `<span class="ans${pick === ans ? "" : " miss"}">${pick === ans ? `Yes, ${esc(label)}.` : `Closer to ${esc(label)}.`}</span>` : "";
  function labHTML() {
    const L = S.lab, st = Math.min(L.step || 0, 3), A = D.LAB;
    const head = `<div class="flow-head"><span class="v6-pill blush">${st + 1} of 4 · ${LAB_STEPS[st]}</span><div class="flow-dots" aria-hidden="true">${LAB_STEPS.map((_, i) => `<span class="${i < st ? "done" : i === st ? "on" : ""}"></span>`).join("")}</div></div>`;
    const peek = `<details class="peek"><summary>Show the session again</summary>${transcriptHTML(L, false)}</details>`;
    let body = "", ok = false;
    if (st === 0) {
      const spot = L.spotPick, hit = spot === A.spot, tries = L.spotTries || 0, found = hit || tries >= 2, cl = L.clues || {};
      const clueChips = `<div class="chips-row">${A.clues.map(([k, l]) => { const on = !!cl[k], right = A.cluesRight.includes(k); return `<button type="button" class="chip${L.cluesDone && on ? (right ? " right" : " wrong") : ""}" data-lab-clue="${k}" aria-pressed="${on}"${L.cluesDone ? " disabled" : ""}>${L.cluesDone && right ? "✓ " : ""}${esc(l)}</button>`; }).join("")}</div>`;
      body = `<p class="flow-sub">${esc(A.intro)}</p>
        <p class="flow-q">The therapist is warm and on topic. But Gene says something they don’t catch. Find the quiet clue.</p>
        ${transcriptHTML(L, found ? false : "spot")}
        ${spot && !found ? `<div class="reveal miss"><b>Not quite.</b> ${esc((A.spotNear && A.spotNear[spot]) || "Look again. Listen for what Gene starts to say and then steps away from.")} <span class="you">Tap another line.</span></div>` : ""}
        ${found ? `<div class="reveal"><b>${hit ? `You caught it: line ${A.spot}.` : `It’s line ${A.spot}.`}</b> What tipped you off? Pick everything you noticed.${clueChips}
          ${L.cluesDone ? `<p style="margin-top:10px">${esc(A.spotWhy)}</p>` : `<button type="button" class="v6-btn secondary" data-lab-clues${Object.values(cl).some(Boolean) ? "" : " disabled"} style="margin-top:10px">Check</button>`}</div>` : ""}`;
      ok = !!(found && L.cluesDone);
    }
    if (st === 1) {
      const so = L.sort || {};
      body = `<p class="flow-q">Here’s what the therapist might have been thinking. Which did ${esc(A.client)} actually say or show, and which did the therapist fill in?</p><p class="flow-sub">Assumptions feel like facts in the moment. This is how you catch them.</p>${peek}
        <div class="sort">${A.sort.map(([t, ans, note], i) => {
          const pick = so[i];
          return `<div class="sort-row${pick ? " answered" : ""}"><span class="st">${esc(t)}</span><span class="sb">${["seen", "supplied"].map(k => `<button type="button" class="chip${pick === k ? (k === ans ? " right" : " wrong") : ""}" data-lab-sort="${i}" data-v="${k}" aria-pressed="${pick === k}">${pick === k && k === ans ? "✓ " : ""}${k === "seen" ? `${esc(A.client)} said it` : "Therapist assumed it"}</button>`).join("")}</span>
            ${pick && pick !== ans ? `<span class="ans miss">Actually ${ans === "seen" ? `${esc(A.client)} said it` : "the therapist assumed it"}${note ? `: ${esc(note)}` : ""}.</span>` : pick && note ? `<span class="ans">${esc(note[0].toUpperCase() + note.slice(1))}.</span>` : ""}</div>`;
        }).join("")}</div>
        ${A.sort.every((_, i) => so[i]) ? `<label class="field lab-check">${esc(A.checkQ)}<small>In your own words. One question is enough.</small><textarea class="v6-ta" rows="2" data-lab-check placeholder="Your question to ${esc(A.client)}">${esc(L.check)}</textarea></label>` : ""}`;
      ok = A.sort.every((_, i) => so[i]) && (L.check || "").trim().length >= 8;
    }
    if (st === 2) {
      const pulls = D.PULLS.map(([t]) => [t, t]);
      body = `<p class="flow-q">What was driving the therapist?</p>${peek}
        <div class="field">Which Pull drove line ${A.pullA[0]}? <small>${q(A.lines[A.pullA[0] - 1][1])}</small>${chipsHTML("data-lab-p4", pulls, L.p4, A.pullA[1])}${fb(L.p4, A.pullA[1], A.pullA[1])}</div>
        <div class="field">Which Pull drove line ${A.pullB[0]}? <small>${q(A.lines[A.pullB[0] - 1][1])}</small>${chipsHTML("data-lab-p8", pulls, L.p8, A.pullB[1])}${fb(L.p8, A.pullB[1], A.pullB[1])}</div>
        <div class="field">Which gap? <small>Knowledge, skill, pressure, or support</small>${chipsHTML("data-lab-gap", D.GAPS.map(([k, l]) => [k, l]), L.gap, A.gap)}${L.gap ? `<span class="ans${L.gap === A.gap ? "" : " miss"}">${esc(A.gapWhy)}</span>` : ""}</div>`;
      ok = !!(L.p4 && L.p8 && L.gap);
    }
    if (st === 3) {
      const pz = L.pause || {}, mv = L.move || "";
      body = `<p class="flow-q">Now you’re the therapist. Rewrite line ${A.turn}.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${esc(A.av)}</span><span class="col"><span class="who">${esc(A.client)} · line ${A.spot}</span><span class="said md">${q(A.react.line)}</span></span></div>
        <div class="orig"><small>What the therapist said (line ${A.turn})</small>${q(A.lines[A.turn - 1][1])}</div>
        <details class="peek"${Object.values(pz).some(v => (v || "").trim()) ? " open" : ""}><summary>Stuck? Use P.A.U.S.E. to get there</summary><div class="pause-form" style="margin-top:10px">${A.pause.map(([l, w, qq]) => `<label class="field"><span class="pl"><b>${l}</b>${esc(w)} · <span>${esc(qq)}</span></span><textarea class="v6-ta" rows="1" data-lab-pause="${l}">${esc(pz[l])}</textarea></label>`).join("")}</div></details>
        <label class="field">Your new line ${A.turn} <small>Say it out loud first, then write it here.</small><textarea class="v6-ta" rows="3" data-lab-move placeholder="What you’d say instead">${esc(mv)}</textarea></label>
        ${L.compared ? `<div class="compare-2"><div class="bd-p"><small>Your version</small>${q(mv)}</div><div class="bd-p t"><small>Another way to say it</small><span class="tk">${q(A.take)}</span></div></div>
          <div class="coach"><small>Why it works</small>${esc(A.takeWhy)}</div>
          ${aiBox("lab-r4", `Hear how ${A.client} responds to your line ${A.turn}`, "react", () => ({ who: A.react.who, context: A.react.context, line: A.react.line, response: (S.lab.move || "").trim(), model: A.take }), res => { S.lab.aiClient = res.client; S.lab.aiNote = res.note; }, { req: ["response"], who: A.client, wait: `${A.client} is responding…`, rkey: "lab#1", akeys: ["aiClient", "aiNote"], where: `Clinical Blind Spot · Line ${A.turn} rewrite` })}
` : ""}`;
      ok = mv.trim().length >= 8;
    }
    const back = st ? `<button type="button" class="v6-btn secondary" data-lab-nav="-1">← Back</button>` : "<span></span>";
    let fwd;
    if (st < 3) fwd = `<button type="button" class="v6-btn primary" data-lab-nav="1"${ok ? "" : " disabled"}>Next: ${LAB_STEPS[st + 1]} →</button>`;
    else if (!L.compared) fwd = `<button type="button" class="v6-btn primary" data-lab-compare${ok ? "" : " disabled"}>See how I’d say it →</button>`;
    else fwd = S.steps.lab ? `<button type="button" class="v6-btn primary next" data-go="week/sim">Next: Imani’s Secret →</button>` : `<button type="button" class="v6-btn primary" data-lab-finish>Finish the Lab ✓</button>`;
    return `<div class="flow">${head}${st === 0 ? `<div class="fiction">Fictional practice scenario. Never enter real client details.</div>` : ""}${body}<div class="actions" style="justify-content:space-between">${back}${fwd}</div></div>`;
  }

  /* ---------- Week 1 Reflect & Redo ---------- */
  const RF_STEPS = ["Your Pull", "Pick one", "Three Checks", "Redo it"];
  /* Everything the student wrote this week that can be redone */
  function rfPool() {
    const out = [], v2 = actV("l2"), v3 = actV("l3");
    if ((v2.r1 || "").trim()) out.push({ id: "l2", tag: "Lesson 2 · Catch the Reaction", who: "Client", raw: "I think you don’t understand me either.", line: q("I think you don’t understand me either."), first: v2.r1 });
    if ((v3.t1 || "").trim()) out.push({ id: "l3", tag: "Lesson 3 · Two Takes", who: "Client", raw: "I don’t even know what I feel anymore.", line: q("I don’t even know what I feel anymore."), first: v3.t1 });
    if (S.demo && (S.demo.line || "").trim()) { const jl = D2() ? D2().moments[0].line : ACTS.demo.moment; out.push({ id: "demo", tag: "Demo · Jordan", who: "Jordan", raw: jl, line: q(jl), first: S.demo.line }); }
    ((S.voice || {}).items || []).forEach((it, k) => { if ((it.said || "").trim()) out.push({ id: "dana:" + k, tag: `Session with Dana · ${it.skill}`, who: "Dana", raw: it.line, line: q(it.line), first: it.said }); });
    D.REPS.filter(r => r.week === 1 && repSaved(r.id)).forEach(r => { const x = S.reps[r.id]; out.push({ id: "rep:" + r.id, rep: r.id, tag: `Rep ${r.id} · ${r.client}`, who: r.client, raw: r.line || r.stageLine || "", line: r.line ? q(r.line) : esc(r.stageLine), first: (x.attempts[0] && x.attempts[0].move) || x.move || x.line || "" }); });
    return out;
  }
  const RF_WORDS = [["exact", "Yes, their exact words"], ["meaning", "Their meaning, not their words"], ["none", "Not this time"]];
  const rfPull = () => (S.reflect.c3 || {}).pl || S.reflect.pullPick || "Rescue";
  const rfOk3 = () => { const c = S.reflect.c3 || {}; return (c.need || "").trim().length >= 3 && !!c.used && (rfPull() === "none" || (c.pullAt || "").trim().length >= 2); };
  function rfTarget(r) {
    const c = S.reflect.c3 || {}, P = rfPull();
    return `<ul class="rt">
      <li>Respond to what ${esc(r.who === "Client" ? "they" : r.who)} really wanted: <i>${esc(c.need)}</i>.</li>
      <li>${c.used === "exact" ? "You used their words. Keep them in." : c.used === "meaning" ? "You caught their meaning. This time, try using one of their exact words." : "Bring in something they actually said."}</li>
      <li>${P === "none" ? `No Pull took over here. Use your redo to try a different angle.` : `Rewrite “${esc((c.pullAt || "").replace(/^[“"\s]+|[”"\s.]+$/g, ""))}.” That’s where ${esc(P)} took over.`}</li></ul>`;
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
      const c = F.c3 || {};
      body = `<p class="flow-q">Run the Three Checks on your first answer.</p>
        <div class="speaker boxed"><span class="av" aria-hidden="true">${r.who[0]}</span><span class="col"><span class="who">${esc(r.who)}</span><span class="said md">${r.line}</span></span></div>
        <div class="you-said sm"><small>Your first answer</small>${q(r.first)}</div>
        <div class="ck3">
          <label class="field"><b>1. ${esc(D.CHECKS[0][0])}</b><small>${esc(D.CHECKS[0][1])} Not what they said, what they wanted.</small><input class="v6-in" data-rf3="need" value="${esc(c.need || "")}" placeholder="They wanted…"></label>
          <div class="field"><b>2. ${esc(D.CHECKS[1][0])}</b><small>Look back at what ${esc(r.who === "Client" ? "they" : r.who)} said.</small><div class="chips-row">${RF_WORDS.map(([k, t]) => `<button type="button" class="chip" data-rf-words="${k}" aria-pressed="${c.used === k}">${t}</button>`).join("")}</div></div>
          <div class="field"><b>3. Which Pull showed up in this answer?</b><small>We started with the one you picked. Change it if a different one showed up here.</small>
            <div class="chips-row">${D.PULLS.map(([t]) => `<button type="button" class="chip" data-rf-pl="${t}" aria-pressed="${rfPull() === t}">${t}</button>`).join("")}<button type="button" class="chip" data-rf-pl="none" aria-pressed="${rfPull() === "none"}">None showed up</button></div>
            ${rfPull() !== "none" ? `<label class="field" style="margin-top:10px">Where did ${esc(rfPull())} take over?<small>Copy the few words from your answer.</small><input class="v6-in" data-rf3="pullAt" value="${esc(c.pullAt || "")}" placeholder="e.g. “Not at all”"></label>` : ""}</div>
        </div>
        ${rfOk3() ? `<div class="reveal"><b>Your redo target</b>${rfTarget(r)}</div>` : ""}`;
      ok = rfOk3();
    }
    if (st === 3 && r) {
      body = `<p class="flow-q">${esc(D.REFLECT[2][1])} Then name the one thing you changed.</p>
        ${rfOk3() ? `<div class="reveal sm"><b>Your redo target</b>${rfTarget(r)}</div>` : ""}
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
    if (!C || C.intro) return `<div class="flow">${fiction}      <div class="sim-skill"><small>What you’re practicing</small>${esc(X.skill)}</div>
      <p class="flow-sub" style="margin:0">${esc(X.setup)}</p>
      <div class="how"><div class="how-h">How this works</div><ol>${[["Read what " + who + " says", ""], ["Pick what you’d say", X.moments[0].best ? "No score. Several answers can work, and after each pick you’ll see which one fits that moment best." : "There’s no right answer and no score. The order of choices changes each time."], ["See how " + who + " reacts", "Then read what your move was trying to do, and what to watch for."]].map(([t, d], i) => `<li><span class="num lg">${i + 1}</span><span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`).join("")}</ol><div class="how-f">Eight moments, then a short debrief. Take your time.</div></div>
      <div class="actions">${C ? `<button type="button" class="v6-btn primary" data-sim-resume>Continue the session →</button>` : `<button type="button" class="v6-btn primary" data-sim-start>Start the session →</button>`}</div>
      ${hist.length ? `<div class="hint">You’ve finished ${hist.length} earlier ${hist.length === 1 ? "attempt" : "attempts"}. They’re saved, and your debrief shows what you chose last time.</div>` : ""}</div>`;
    const i = Math.min(C.i, n);
    const back = i ? `<button type="button" class="v6-btn secondary" data-sim-go="${i - 1}">← Back</button>` : `<button type="button" class="v6-btn secondary" data-sim-intro>← Back</button>`;
    const head = `<div class="flow-head"><span class="v6-pill blush">${i < n ? `Moment ${i + 1} of ${n}` : "Debrief"}</span><div class="flow-dots sim8" aria-hidden="true">${X.moments.map((_, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}"></span>`).join("")}<span class="${i === n ? "on" : ""}"></span></div></div>`;
    const client = (txt, md) => `<div class="speaker${md ? "" : " boxed"}"><span class="av" aria-hidden="true">${who[0]}</span><span class="col"><span class="who">${esc(who)}</span><span class="said${md ? " md" : ""}">${q(txt)}</span></span></div>`;
    if (i < n) {
      const m = X.moments[i], p = C.picks[i];
      let body = client(m.client);
      if (p == null) {
        body += `<p class="flow-q">What would you say?</p><div class="choices">${C.order[i].map(k => `<button type="button" class="choice" data-sim-pick="${k}"><span>${q(m.choices[k][1])}</span></button>`).join("")}</div>`;
        return `<div class="flow">${head}${body}<div class="actions">${back}</div></div>`;
      }
      const c = m.choices[p];
      body += `<div class="you-said"><small>You</small>${q(c[1])}</div>${client(c[2], true)}
        <details class="coach-d" open><summary>Coach note</summary><div class="coach2"><div><small>${esc((X.noteLabels || [])[0] || "What this move was trying to do")}</small>${esc(c[3])}</div><div><small>${esc((X.noteLabels || [])[1] || "What to watch for")}</small>${esc(c[4])}</div></div>${m.best ? (m.best[0] === p ? `<div class="sim-best"><span class="sb-tag">✓ Strongest fit here</span>${esc(m.best[1])}</div>` : `<div class="sim-best"><span class="sb-tag">Strongest fit here</span><span class="sb-line">${q(m.choices[m.best[0]][1])}</span>${esc(m.best[1])}</div>`) : ""}</details>
        ${INTENT_AT.includes(i) ? `<label class="field intent">Take 20 seconds. What was your intention? <small>Optional, just for you</small><textarea class="v6-ta" rows="2" data-sim-intent="${i}" placeholder="I was trying to…">${esc(C.intent[i])}</textarea></label>` : ""}`;
      return `<div class="flow">${head}${body}<div class="actions" style="justify-content:space-between"><span style="display:flex;gap:10px;flex-wrap:wrap">${back}<button type="button" class="v6-btn secondary" data-sim-rewind="${i}">↺ Try a different response</button></span>
        <button type="button" class="v6-btn primary" data-sim-go="${i + 1}">${i === n - 1 ? "Go to the debrief →" : "Continue →"}</button></div></div>`;
    }
    const last = hist[hist.length - 1];
    const rows = X.moments.map((m, k) => { const c = m.choices[C.picks[k]]; if (!c) return ""; const prev = last && last.picks[k] != null && last.picks[k] !== C.picks[k] ? m.choices[last.picks[k]] : null;
      return `<li><span class="mn">${k + 1}</span><span class="mb"><span class="cl">${esc(who)}: ${q(m.client)}</span><span class="me">You: ${q(c[1])}</span><span class="re">${esc(who)}: ${q(c[2])}</span>${prev ? `<span class="pv">Last time you said: ${q(prev[1])}</span>` : ""}</span></li>`; }).join("");
    const R = C.ref, ok = X.debrief.every((_, k) => (R[k] || "").trim());
    return `<div class="flow">${head}<p class="flow-q">Look back at your session.</p>
      <details class="peek"><summary>Your path: all 8 moments</summary><ol class="path">${rows}</ol></details>
      ${X.debrief.map((qq, k) => `<label class="field">${k + 1}. ${esc(qq)}<textarea class="v6-ta" rows="${k === 2 ? 3 : 2}" data-sim-ref="${k}">${esc(R[k])}</textarea></label>`).join("")}
      <div class="actions">${back}${C.saved ? `<button type="button" class="v6-btn primary next" data-go="week/reflect">Next: Reflect & Redo →</button><button type="button" class="v6-btn secondary" data-sim-again>Try the session again</button>`
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
      const DM = S.demo = S.demo || {}, AD = ACTS.demo;
      const fin = !!DM.watched;
      body = demo2HTML();
      if (fin) { const M1 = D2().moments[0];
        body += `<div class="act-card look-demo demo-turn"><span class="v6-label">Your turn</span><span class="ac-name">Jordan asks you</span>
          <span class="ac-t">No options this time. Just you.</span>
          ${d2Aud("Jordan", M1.line, "j", "m1-jordan")}
          <div class="d2-rec">${D2REC.url ? `<audio controls src="${D2REC.url}"></audio><button type="button" class="v6-link" data-d2-rec>↺ Record again</button>` : `<button type="button" class="v6-btn ${D2REC.on ? "secondary" : "primary"}" data-d2-rec>${D2REC.on ? "■ Stop" : "🎙 Answer out loud"}</button>`}<small>Only you can hear this. It isn’t saved or sent anywhere.</small></div>
          <label class="field">Now write what you said, or a cleaner version<textarea class="v6-ta" rows="2" data-demo="line" placeholder="What you’d say to Jordan">${esc(DM.line)}</textarea></label>
          <div class="field"><b>Which Pull did you feel while choosing today?</b><div class="chips-row">${D.PULLS.map(([p]) => `<button type="button" class="chip" data-demo-pull="${p}" aria-pressed="${DM.pull === p}">${p}</button>`).join("")}<button type="button" class="chip" data-demo-pull="None" aria-pressed="${DM.pull === "None"}">None I noticed</button></div></div></div>`; }
      const dOk = !!DM.pull && (DM.line || "").trim().length >= 3;
      cta = !fin ? "" : (done ? `<button type="button" class="v6-btn secondary" disabled>Saved ✓</button>` : `<button type="button" class="v6-btn ${DM.watched ? "primary" : "secondary"}" data-act="demosave"${dOk && DM.watched ? "" : " disabled"}>Save my turn ✓</button>`);
    }
    if (s.type === "lab" || s.type === "sim") {
      body = locked ? itemsHTML(s.itemsLabel, s.items) : s.type === "lab" ? labHTML() : simHTML();
      cta = "";
    }
    if (s.type === "voice") { body = locked ? "" : vgView().html; cta = ""; }
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
      const lines = [[ "When a client says I don’t understand them…", v2.r2 || v2.r1 ], ["When a client doesn’t know what they feel…", v3.t2], ["When a client starts to open up…", v3.t4], ["When a client asks me to decide for them…", S.demo && S.demo.line]].filter(x => (x[1] || "").trim())
        .concat(D.REPS.filter(r => r.week === 1 && repSaved(r.id) && S.reps[r.id].line.trim()).map(r => [r.bank + "…", S.reps[r.id].line]));
      body = `<div class="profile">
        <div class="banner-soft">Filled in from your Week 1 choices. Edit anything.</div>
        <h3 class="pf-h">What I noticed</h3>
        ${sec("gap", "The gap I want to investigate", "A hypothesis, not a diagnosis", "Add the gap you want to look into")}
        ${sec("pull", "My Pull, and the cue I notice first", "", "Add the Pull that grabs you, and what you notice first")}
        ${sec("move", "My grounded first move", "From the Lab", "Add one line you’d actually say")}
        <h3 class="pf-h">My Imani practice</h3>
        ${path ? `<div class="pf-path">${esc(path).replace(/\n/g, "<br>")}</div>` : `<div class="empty">Your path shows up here after the simulation.</div>`}
        ${sec("shift", "When the priority changed", "", "Add what changed when Imani shared new information")}
        ${sec("adjust", "My closing for Imani", "Includes a collaborative safety step and is honest about what stays private", "Add your closing")}
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

    const media = ["lab", "sim", "save", "reflect", "demo"].includes(s.type) ? "" : video(s.video, s.img, !!s.video);
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
    let h = `${sc.stage ? `<span class="act-stage st-${sc.stage.split(" ")[0].toLowerCase()}">${esc(sc.stage)}</span>` : ""}<h2 class="act-h">${esc(sc.title)}</h2>`, ok = true;
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
    if (K === "follow") {
      const ctx = { who: "a client in session 4 who has had a hard month", context: "She's been describing a hard month. Then she stopped and said, flatly, that she doesn't even know what she feels anymore." };
      const meta = { rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, where: `${X.name} · ${sc.title}` };
      const aid = `act-${X.key}-${i}-a`, aerr = ((S.ai || {})[aid] || {}).err;
      const step = (n, t, sub) => `<div class="fl-step"><span class="fl-n">${n}</span><span><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></div>`;
      h += `<p class="act-p">${esc(sc.text)}</p>`
        + step(1, "You said (your Take 2)") + `<div class="act-you">${q(v.t2 || "")}</div>`
        + step(2, "She answers", "Read it closely. What’s new in what she just said?")
        + aiBox(aid, "Hear her answer", "react", () => ({ ...ctx, line: sc.moment.line, response: (v.t2 || "").trim() }), res => { v.her = res.client; v[`ai${i}_client`] = res.client; v[`ai${i}_note`] = res.note; }, { auto: true, req: ["response"], who: "Client", wait: "She’s responding…", akeys: [`ai${i}_client`, `ai${i}_note`], noNote: true, ...meta });
      if (!v.her && aerr) v.her = sc.fallback;
      if (aerr && v.her === sc.fallback) h += `<div class="lv-client"><span class="lv-av" aria-hidden="true">C</span><div class="lv-say">${q(v.her)}</div></div>`;
      if (v.her) {
        h += step(3, "Your next move", "Pick up something from her answer: a word, a feeling, or what changed.")
          + `<textarea class="v6-ta" rows="3" data-at="t4" aria-label="Your next move" placeholder="Respond to what she just said">${esc(v.t4)}</textarea>`
          + step(4, "Check it", "Optional. See how she takes it, with a training note.")
          + aiBox(`act-${X.key}-${i}-b`, "How does she take it?", "react", () => ({ ...ctx, line: v.her || sc.fallback, response: (v.t4 || "").trim() }), res => { v[`ai${i}b_client`] = res.client; v[`ai${i}b_note`] = res.note; }, { req: ["response"], who: "Client", wait: "Processing…", akeys: [`ai${i}b_client`, `ai${i}b_note`], ...meta })
          + exHTML(sc);
      }
      ok = filled(v.t4);
    }
    if (K === "walk") {
      const shown = Math.min(sc.steps.length, v["w" + i] || 1);
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p><div class="act-walk show">${sc.steps.slice(0, shown).map(([l, nm, t]) => `<div class="aw"><span class="lt">${l}</span><span class="aw-b"><b>${esc(nm)}</b>${esc(t)}</span></div>`).join("")}</div>`
        + (shown < sc.steps.length ? `<button type="button" class="v6-btn secondary act-check" data-walk="${i}">Next step: ${esc(sc.steps[shown][1])} →</button>` : `<p class="act-close">${esc(sc.after)}</p>`);
      ok = shown >= sc.steps.length;
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
      h += momentHTML(sc.moment) + (sc.text ? `<p class="act-p">${esc(sc.text)}</p>` : "") + sc.fields.map(([k, l, ph]) => `<label class="field">${esc(l)}<textarea class="v6-ta" rows="2" data-at="${k}" placeholder="${esc(ph)}">${esc(v[k])}</textarea></label>`).join("")
        + `<details class="act-ex"><summary>See an example</summary><p>${esc(sc.example)} Don’t memorize it. Say it your way.</p></details>
        ${aiBox(`act-${X.key}-${i}`, "Hear how the client responds", "react", () => ({ who: "a client in session 6, arms crossed", context: "Last week the therapist suggested a thought record. The client didn't do it and feels like every helper hands them homework instead of listening.", line: sc.moment.line, response: (v.r1 || "").trim() }), res => { v[`ai${i}_client`] = res.client; v[`ai${i}_note`] = res.note; }, { req: ["response"], who: "Client", wait: "The client is responding…", rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` })}`;
      ok = sc.fields.every(([k]) => filled(v[k]));
    }
    if (K === "reflect") {
      const cl = v[`ai${i - 1}_client`];
      h += `<p class="act-p">${esc(sc.text)}</p><div class="act-you"><small>You said</small>${q(v[sc.show] || "")}</div>${cl ? `<div class="act-you client"><small>The client said</small>${q(cl)}</div>` : ""}
        <div class="act-reflect">${sc.items.map(([k, qq, opts]) => { const cur = v[k], o = opts.find(x => x[0] === cur);
          return `<div class="rf-q"><span class="rf-t">${esc(qq)}</span>${pickChips("data-av", opts.map(x => x[0]), cur, ` data-f="${k}"`)}${o ? `<div class="act-fb ${o[2] ? "yes" : "no"}">${esc(o[1])}</div>` : ""}</div>`; }).join("")}</div>`;
      const all = sc.items.every(([k]) => v[k]), anyOff = sc.items.some(([k, , opts]) => { const o = opts.find(x => x[0] === v[k]); return o && !o[2]; });
      if (all) h += `${anyOff || v.r2 ? `<label class="field">${esc(sc.revise)} <small>Optional</small><textarea class="v6-ta" rows="2" data-at="r2" placeholder="Same moment, adjusted">${esc(v.r2)}</textarea></label>` : ""}<p class="act-close">${esc(sc.closing)}</p>`;
      ok = all;
    }
    if (K === "check") {
      const cur = v.ck;
      h += `<div class="act-you"><small>You said</small>${q(v[sc.show] || v.r1 || "")}</div><p class="act-p big">${esc(sc.text)}</p>${pickChips("data-av", sc.options, cur, ' data-f="ck"')}`
        + (cur ? `<div class="act-fb ${cur === "Yes" ? "yes" : "no"}">${esc(sc.fb[cur])}</div>` : "");
      ok = !!cur;
    }
    if (K === "take") {
      h += momentHTML(sc.moment) + `<p class="act-p">${esc(sc.text)}</p><label class="field"><span class="take-n">Take ${sc.n}</span><textarea class="v6-ta" rows="3" data-at="t${sc.n}" placeholder="Type it the way you’d say it">${esc(v["t" + sc.n])}</textarea></label>${sc.ai ? aiBox(`act-${X.key}-${i}`, "Hear her response", "react", () => ({ who: "a client in session 4 who has had a hard month", context: "She's been describing a hard month. Then she stopped and said, flatly, that she doesn't even know what she feels anymore.", line: sc.moment.line, response: (v["t" + sc.n] || "").trim() }), res => { v[`ai${i}_client`] = res.client; v[`ai${i}_note`] = res.note; }, { req: ["response"], who: "Client", wait: "She’s responding…", rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` }) : ""}`;
      ok = filled(v["t" + sc.n]);
    }
    if (K === "pausewalk") {
      h += momentHTML(sc.moment) + `<div class="act-walk">${sc.steps.map(([l, nm, pr, ph, key, flag]) => { const k = key || l, big = flag === "big";
        return `<label class="aw${big ? " say" : ""}"><span class="lt">${l}</span><span class="aw-b"><b>${esc(nm)}</b> ${esc(pr)}${big ? `<textarea class="v6-ta" rows="3" data-at="${k}" placeholder="${esc(ph)}">${esc(v[k])}</textarea>` : `<input class="v6-in" type="text" data-at="${k}" value="${esc(v[k])}" placeholder="${esc(ph)}">`}</span></label>`; }).join("")}</div>`;
      ok = filled(v.U, 2) && filled(v.t2);
    }
    if (K === "compare") {
      h += `<div class="act-cmp"><div><small>Take 1 · instinct</small>${q(v.t1 || "")}</div><div class="t2"><small>Take 2 · P.A.U.S.E.</small>${q(v.t2 || "")}</div></div>
        ${sc.text ? `<p class="act-p">${esc(sc.text)}</p>` : ""}<div class="act-reflect">${sc.qs.map(([tag, qq, opts, fb, how], k) => { const cur = v["c" + k];
          if (how && how.multi) { /* pick as many as fit */
            const sel = Array.isArray(cur) ? cur : [];
            return `<div class="rf-q"><span class="rf-tag">${esc(tag)}</span><span class="rf-t">${esc(qq)} <small class="rf-hint">Pick all that fit.</small></span><div class="act-chips">${opts.map(o => `<button type="button" class="act-chip" data-avm="${esc(o)}" data-f="c${k}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join("")}</div>${sel.filter(o => fb[o]).map(o => `<div class="act-fb yes">${esc(fb[o])}</div>`).join("")}</div>`;
          }
          return `<div class="rf-q"><span class="rf-tag">${esc(tag)}</span><span class="rf-t">${esc(qq)}</span>${pickChips("data-av", opts, cur, ` data-f="c${k}"`)}${cur && fb[cur] ? `<div class="act-fb yes">${esc(fb[cur])}</div>` : ""}</div>`; }).join("")}</div>
        ${aiBox(`act-${X.key}-${i}`, "What changed between my takes?", "compare", () => ({ line: (X.screens.find(z => z.kind === "take") || {}).moment.line, take1: v.t1 || "", take2: v.t2 || "" }), res => { v[`ai${i}_note`] = res.note; }, { req: ["take1", "take2"], rkey: `act-${X.key}#${(S.act[X.key] || {}).n || 1}`, akeys: [`ai${i}_client`, `ai${i}_note`], where: `${X.name} · ${sc.title}` })}
        ${sc.examples ? `<div class="act-ex"><p class="act-ex-h">${esc(sc.examples.title)}</p>${sc.examples.note ? `<p class="act-ex-n">${esc(sc.examples.note)}</p>` : ""}<ul>${sc.examples.items.map(([l, t]) => `<li><small>${esc(l)}</small><span>“${esc(t)}”</span></li>`).join("")}</ul></div>` : ""}`;
      ok = sc.qs.every((_, k) => Array.isArray(v["c" + k]) ? v["c" + k].length : v["c" + k]);
    }
    if (K === "summary") {
      const row = (l, t) => t ? `<div class="sm-row"><small>${esc(l)}</small><span>${t}</span></div>` : "";
      if (X.key === "l1") h += row("Your moment", q(v.what)) + row("The gap", esc((v.gaps || []).map(k => ACTS.GAP[k]).join(" + "))) + row("Your action this week", esc(v.action)) + `<p class="act-done">✓ Saved to your Clinical Confidence Profile.</p>`;
      if (X.key === "l2") h += row("First thought", q(v.thought)) + row("Tempted to", esc(v.urge)) + row("Where you feel it", esc(v.body)) + row("Your reset", esc(v.reset)) + row("Your words", q(v.r2 || v.r1)) + (v.r2 && v.r1 ? row("First version", q(v.r1)) : "") + `<p class="act-done">✓ Saved to your Clinical Confidence Profile.</p>`;
      if (X.key === "l3") h += row("Take 1 · instinct", q(v.t1)) + row("Take 2 · P.A.U.S.E.", q(v.t2)) + (v.her ? row("She said", q(v.her)) : "") + row("Your next move", q(v.t4)) + row("The limit", "When safety information appears, assessment, procedures, and consultation come first.") + `<p class="act-done">✓ Saved to your Profile’s “What I Say When…” lines.</p>`;
    }
    return { h, ok };
  }
  const exHTML = sc => sc.examples ? `<div class="act-ex"><p class="act-ex-h">${esc(sc.examples.title)}</p>${sc.examples.note ? `<p class="act-ex-n">${esc(sc.examples.note)}</p>` : ""}<ul>${sc.examples.items.map(([l, t]) => `<li><small>${esc(l)}</small><span>“${esc(t)}”</span></li>`).join("")}</ul></div>` : "";
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
  /* Training notes come back in parts: what's working (always), something to watch (sometimes), a question to explore */
  const noteLabeled = p => p ? [p.working && `What's working: ${p.working}`, p.build && `${p.mode === "keep" ? "Keep doing this" : "Build on it"}${p.skill ? ` (${p.skill})` : ""}: ${p.build}`, p.watch && `Something to watch: ${p.watch}`, p.question && `To explore: ${p.question}`].filter(Boolean).join("\n") : "";
  const noteBody = (p, fallback) => p && (p.working || p.question || p.build)
    ? `${p.working ? `<span class="nt-row work"><i aria-hidden="true">✓</i><span><b>What’s working</b>${esc(p.working)}</span></span>` : ""}${p.build ? `<span class="nt-row build${p.mode === "keep" ? " keep" : ""}"><i aria-hidden="true">${p.mode === "keep" ? "★" : "↑"}</i><span><b>${p.mode === "keep" ? "Keep doing this" : "Build on it"}${p.skill ? ` <em class="nt-skill">${esc(p.skill)}</em>` : ""}</b>${esc(p.build)}</span></span>` : ""}${p.watch ? `<span class="nt-row watch"><i aria-hidden="true">↗</i><span><b>Something to watch</b>${esc(p.watch)}</span></span>` : ""}${p.question ? `<span class="nt-row ask"><i aria-hidden="true">?</i><span><b>To explore</b>${esc(p.question)}</span></span>` : ""}`
    : esc(fallback || "");
  /* Thumbs up / down under every practice-partner reply. Saved in S.fb and logged to Airtable "AI Feedback". */
  function rateHTML(fbid, meta) {
    RATE[fbid] = meta;
    const f = (S.fb || {})[fbid] || {};
    return `<div class="rate" data-rate-row="${fbid}"><span>${esc(meta.label || "Was this helpful?")}</span>
      <button type="button" class="rate-b${f.rating === "up" ? " on" : ""}" data-rate="${fbid}" data-val="up" aria-pressed="${f.rating === "up"}" aria-label="Helpful">👍🏽</button>
      <button type="button" class="rate-b${f.rating === "down" ? " on" : ""}" data-rate="${fbid}" data-val="down" aria-pressed="${f.rating === "down"}" aria-label="Not helpful or not accurate">👎🏽</button>
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
      if ((res.note || res.parts) && !o.noNote) h += `<div class="lv-note${res.safety ? " safety" : ""}"><span class="lv-tag">${res.safety ? "Pause" : "✦ Training note"}</span>${res.safety ? esc(res.note) : noteBody(res.parts, res.note)}</div>`;
      if (!res.safety && o.rkey && !o.noNote) h += rateHTML(`${id}@${r.at || ""}`, { rkey: o.rkey, akeys: o.akeys || [], where: o.where || label, type: res.client ? "Client reply" : "Training note", ai: [res.client && `Client: ${res.client}`, res.note && `Training note: ${res.note}`].filter(Boolean).join("\n"), input: data.response || data.action || data.take2 || data.sentence || "" });
    }
    if (AIBUSY[id]) h += `<div class="lv-wait" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(o.wait || "Processing…")}</div>`;
    else if (!fresh) h += `<button type="button" class="ai-btn" data-ai="${id}"${ready ? "" : " disabled"}><span class="ai-spark" aria-hidden="true">✦</span><span><b>${esc(label)}</b><small>${ready ? (o.sub || "Responds to your exact words") : (o.need || "Write your answer first")}</small></span></button>`;
    else if (!o.noNote) h += `<button type="button" class="v6-link ai-again" data-ai="${id}">↺ Ask again</button>`;
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
      const { res, out } = await api("/.netlify/functions/lab-ai-assist", { task: R.task, data: R.data });
      if (!res.ok || !out.ok) throw new Error(out.error || "This isn’t available right now. Try again in a moment.");
      S.ai[id] = { sig: aiSig(R.data), res: { client: out.client || "", note: (out.parts && noteLabeled(out.parts)) || out.note || "", parts: out.parts || null, safety: !!out.safety }, at: new Date().toISOString() };
      if (R.save) R.save(S.ai[id].res);
    } catch (e) { S.ai[id] = { ...(S.ai[id] || {}), err: e.message || "Something went wrong. Try again." }; }
    AIBUSY[id] = false; save(); render();
  }
  function bindAI() {
    $$("[data-ai]").forEach(b => b.onclick = () => aiRun(b.dataset.ai));
    bindRate();
    Object.entries(AIREQ).forEach(([id, R]) => { const r = (S.ai || {})[id]; if (R.auto && !AIBUSY[id] && !(r && r.sig === aiSig(R.dataFn()) && (r.res || r.err)) && document.querySelector(`[data-ai="${id}"]`)) setTimeout(() => aiRun(id), 50); });
  }

  /* ---------- Demo v2: branching audio session with Jordan (lab-v6-demo2.js) ---------- */
  const D2 = () => window.TCC6_DEMO2;
  const d2State = () => { const DM = S.demo = S.demo || {}; return DM.d2 = DM.d2 || { i: 0, heard: {}, pick: {}, played: {}, others: {} }; };
  const d2Bub = (who, text, cls) => `<div class="d2-b ${cls}"><span class="who">${who}</span><span class="said">${q(text)}</span></div>`;
  /* audio-first rows: speaker + a small play button; words only when "Show words" is on */
  const d2Aud = (who, text, cls, code) => { const st = d2State();
    return `<div class="d2-row ${cls}"><span class="av" aria-hidden="true">${cls === "j" ? "J" : "You"}</span><div class="d2-col"><span class="who">${who}</span>${st.words ? `<span class="said">${q(text)}</span>` : `<span class="wave" aria-hidden="true"></span>`}</div><button type="button" class="d2-pl" data-d2-replay="${code}" aria-label="Play ${esc(who)}">▶</button></div>`; };
  function demo2HTML() {
    const X = D2(), st = d2State(), n = X.moments.length, i = Math.min(st.i, n), L = "ABC";
    const intro = `<span class="v6-label">Listen · ${i >= n ? "Done" : `Moment ${i + 1} of ${n}`}</span><span class="ac-name">A session with Jordan</span>
      ${i === 0 ? `<span class="ac-t">Turn your sound on. Jordan speaks, you pick what you’d say, and you’ll hear how it lands. ${esc(X.setup)}</span>`
        : `<details class="d2-about"><summary>About this session</summary><p>Jordan speaks, you pick what you’d say, and you’ll hear how it lands. ${esc(X.setup)}</p></details>`}
      <div class="d2-prog">${X.moments.map((_, k) => `<i class="${k < i ? "done" : k === i ? "cur" : ""}"></i>`).join("")}</div>
      ${i > 0 || st.heard[0] ? `<button type="button" class="v6-link d2-restart" data-d2-restart>↺ Start the session over</button>` : ""}`;
    if (i >= n) {
      const path = X.moments.map((m, k) => st.pick[k] != null ? `<li><b>${esc(m.title)}</b> · you chose ${L[st.pick[k]]}</li>` : "").join("");
      return `<div class="act-card look-demo d2">${intro}<div class="d2-note"><b>Tiffany’s wrap-up</b><p>${esc(X.wrap)}</p></div>
        <details class="d2-path"><summary>Your path through the session</summary><ol>${path}</ol></details>
        <div class="dw-nav"><button type="button" class="v6-link" data-d2-restart>Go through the session again</button></div></div>`;
    }
    const m = X.moments[i], pk = st.pick[i], heard = !!st.heard[i], played = !!st.played[i], oth = st.others[i] || {};
    let h = `<div class="d2-moment"><div class="d2-head"><span class="d2-title">${esc(m.title)}</span>${heard ? `<button type="button" class="d2-words" data-d2-words aria-pressed="${!!st.words}">${st.words ? "Hide words" : "Show words"}</button>` : ""}</div>
      ${heard ? d2Aud("Jordan", m.line, "j", `m${i + 1}-jordan`) : `<div class="d2-play"><button type="button" class="v6-btn primary" data-d2-hear>▶ Hear Jordan</button></div>`}`;
    const ho = (st.ho || {})[i] || {};
    if (heard && pk == null) h += `<div class="d2-q"><b>What would you say?</b><span class="d2-sub">Listen to all three, then choose the one you’d go with.</span>
      <div class="d2-cards">${m.opts.map((o, k) => `<div class="d2-card${ho[k] ? " heard" : ""}"><span class="big">${L[k]}</span>${st.words ? `<span class="said">${q(o)}</span>` : `<span class="wave" aria-hidden="true"></span>`}
        <button type="button" class="d2-listen" data-d2-opt="${k}">▶ ${ho[k] ? "Replay" : "Listen"}</button>
        <button type="button" class="v6-btn primary small" data-d2-pick="${k}"${ho[k] || st.words ? "" : " disabled"}>I’d say ${L[k]}</button></div>`).join("")}</div></div>`;
    if (pk != null) h += `<div class="d2-run" data-d2-run>${d2Aud("You · " + L[pk], m.opts[pk], "t", `m${i + 1}-${"abc"[pk]}`)}${played ? d2Aud("Jordan", m.reacts[pk], "j", `m${i + 1}-r${"abc"[pk]}`) : `<div class="d2-wait">Playing… <button type="button" class="d2-listen" data-d2-stop>❚❚ Pause</button></div>`}</div>`;
    if (played) {
      const tk = k => (m.takes || [])[k] || "";
      h += `<div class="d2-note"><b>Tiffany’s take on ${L[pk]}</b><p>${esc(m.takes ? tk(pk) : m.note)}</p></div>
        <div class="d2-others"><b>Hear the other options</b>${[0, 1, 2].filter(k => k !== pk).map(k => { const isOpen = ((st.tko || {})[i] || {})["o" + k];
          return `<details class="d2-oth${oth[k] ? " heard" : ""}" data-d2-tk="o${k}"${isOpen ? " open" : ""}><summary><span class="k">${L[k]}</span><span class="s">What if you’d said ${L[k]}?</span>${oth[k] ? `<span class="ok" aria-label="heard">✓</span>` : ""}</summary>
            <div class="d2-oth-b"><button type="button" class="d2-listen" data-d2-other="${k}"><span class="t">▶ ${oth[k] ? "Play again" : `Hear ${L[k]}, then Jordan`}</span></button>
            ${st.words ? `<p class="d2-oth-line"><small>You</small>${q(m.opts[k])}</p><p class="d2-oth-line j"><small>Jordan</small>${q(m.reacts[k])}</p>` : ""}
            ${oth[k] && tk(k) ? `<div class="d2-oth-take"><b>Tiffany’s take</b><p>${esc(tk(k))}</p></div>` : ""}</div></details>`; }).join("")}${m.takes && m.takeAll && [0, 1, 2].every(k => k === pk || oth[k]) ? `<details class="d2-note sm d2-drop" data-d2-tk="all"${((st.tko || {})[i] || {}).all ? " open" : ""}><summary>All three</summary><p>${esc(m.takeAll)}</p></details>` : ""}</div>
        <div class="dw-nav"><button type="button" class="v6-btn primary" data-d2-next>${i === n - 1 ? "Finish the session →" : "Next moment →"}</button></div>`;
    }
    return `<div class="act-card look-demo d2">${intro}${h}</div></div>`;
  }
  let d2Run = 0;
  /* Your turn: a private recording, kept only in this browser tab */
  const D2REC = { on: false, url: "", rec: null };
  async function d2Record() {
    if (D2REC.on && D2REC.rec) { D2REC.rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), rec = new MediaRecorder(stream), ch = [];
      rec.ondataavailable = e => e.data.size && ch.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); D2REC.on = false; D2REC.url = URL.createObjectURL(new Blob(ch, { type: rec.mimeType || "audio/webm" })); render(); };
      D2REC.url = ""; D2REC.rec = rec; D2REC.on = true; rec.start(); render();
    } catch (e) { flash("Your microphone isn’t available. You can just type your answer."); }
  }
  /* play clips in order; a clip that isn't recorded yet waits a reading-pace pause instead */
  /* after a pick the page gets shorter: bring the student's answer and Jordan's reaction into view */
  function d2ToRun() { requestAnimationFrame(() => { const r = document.querySelector("[data-d2-run]"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" }); }); }
  let d2Cur = null;
  /* Pause: stop whatever the Demo is playing (and any sequence it was in the middle of) */
  function d2Stop() { d2Run++; if (d2Cur) { const a = d2Cur; d2Cur = null; a.pause(); a.dispatchEvent(new Event("ended")); } }
  /* A play button that turns into a pause button while it plays. onDone(true) only if it played all the way through. */
  async function d2Btn(b, items, onDone, playing = "❚❚ Pause") {
    if (b.dataset.playing) { d2Stop(); return; }
    const label = b.innerHTML; b.dataset.playing = "1"; b.classList.add("on");
    const t = b.querySelector(".t") || b; const tl = t.innerHTML; t.textContent = playing;
    const ok = await d2Play(items);
    delete b.dataset.playing; b.classList.remove("on"); if (t === b) b.innerHTML = label; else t.innerHTML = tl;
    if (onDone) onDone(ok);
  }
  async function d2Play(items) {
    const run = ++d2Run, X = D2();
    for (const [code, text] of items) {
      if (run !== d2Run) return false;
      await new Promise(done => {
        const wait = () => setTimeout(done, Math.min(6000, 700 + text.length * 40));
        if (!X.ready.includes(code)) return wait();
        const au = new Audio(X.audioBase + code + ".mp3?v=" + (X.v || 1)); d2Cur = au; au.onended = () => { if (d2Cur === au) d2Cur = null; done(); }; au.onerror = wait; au.play().catch(wait);
      });
      await new Promise(r => setTimeout(r, 300));
    }
    return run === d2Run;
  }

  /* ---------- Demo audio conversation ---------- */
  const convoLine = l => `<div class="dw-line ${l[1] === "T" ? "t" : "j"}"><span class="who">${l[1] === "T" ? "Therapist" : "Jordan"}</span><span class="said">${esc(l[2])}</span></div>`;
  let convoRun = 0;
  async function playConvo(k) {
    const run = ++convoRun, AD = ACTS.demo, w = AD.walk[k], box = $(`[data-convo="${k}"] .dw-lines`);
    if (!box || !w) return;
    box.innerHTML = "";
    const btn = $(`[data-play="${k}"]`); if (btn) { btn.disabled = true; btn.textContent = "Playing…"; }
    for (const l of w.lines) {
      if (run !== convoRun || !document.body.contains(box)) return;
      box.insertAdjacentHTML("beforeend", convoLine(l).replace('class="dw-line', 'class="dw-line now'));
      const el = box.lastElementChild; el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const ready = (AD.audioReady || []).includes(l[0]);
      await new Promise(done => {
        const fallback = () => setTimeout(done, Math.min(5200, 900 + l[2].length * 38));
        if (!ready) return fallback();
        const au = new Audio(AD.audioBase + l[0] + ".mp3");
        au.onended = () => done(); au.onerror = fallback;
        au.play().catch(fallback);
      });
      el.classList.remove("now");
      await new Promise(r => setTimeout(r, 350));
    }
    if (run !== convoRun) return;
    S.demo.heard = { ...(S.demo.heard || {}), [k]: true }; save(); render();
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
  const isTestAccount = () => !!(session() || {}).test; /* the shared preview account is unlimited; real students are limited */
  const liveState = () => (S.live = S.live || { past: [], cur: null });
  const liveNew = () => ({ id: Math.random().toString(36).slice(2, 9), started: new Date().toISOString(), moments: [{ client: LIVE_OPEN }], refinesUsed: 0, phase: "attempt", done: false });
  async function liveCall(mode, sess) {
    const { res, out } = await api(LIVE.url, JSON.stringify({ scenario: "dana", sessionId: sess.id, mode, moments: sess.moments.map(m => ({ client: m.client, attempts: (m.attempts || []).map(a => ({ text: a.text, note: a.note || "" })) })) }));
    if (!res.ok || !out.ok) throw new Error(out.error || "The practice partner is unavailable right now.");
    if (mode !== "wrap" && !String(out.text || "").trim()) throw new Error("That didn’t come through. Tap Try again.");
    return out;
  }
  function liveView() {
    const L = liveState(), C = L.cur;
    const intro = `<div class="live-intro">
        <span class="live-eyebrow">✦ Live session · Practice partner</span>
        <h2>Ten moments with Dana.</h2>
        <p>Dana is a fictional client, six sessions in and a little guarded today. Answer the way you would in the room.</p>
        <ol class="live-how"><li><span><b>Dana talks</b>You answer in your own words.</span></li><li><span><b>You get a training note</b>A question to help you look again.</span></li><li><span><b>You decide</b>Try again (3 per session) or hear Dana’s reaction.</span></li><li><span><b>You get a summary</b>Where the session opened up, and where it closed.</span></li></ol>
        <div class="live-meta"><span>About 15 minutes</span><span>Fictional practice only</span></div>
        ${(() => { const used = liveUses().length, left = Math.max(0, LIVE.perDay - used), test = isTestAccount(), blocked = !left && !test;
          return `<div class="live-allow"><b>${left} of ${LIVE.perDay} sessions left today</b>${used ? `<span>${left ? "One more opens" : "Your next session opens"} in ${liveResetIn()}</span>` : `<span>Resets every 24 hours</span>`}${test && !left ? `<span>Test account: keep going</span>` : ""}</div>
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
          + (a.note ? `<div class="lv-note${a.safety ? " safety" : ""}${old ? " old" : ""}"><span class="lv-tag">${a.safety ? "Pause" : "Training note"}</span>${a.safety ? esc(a.note) : noteBody(a.parts, a.note)}</div>` : "");
      }).join("");
      const prevA = k ? ((C.moments[k - 1].attempts || []).slice(-1)[0] || {}).text || "" : "";
      return `<div class="lv-moment${last ? " now" : ""}"><span class="lv-mn">Moment ${k + 1}</span><div class="lv-client"><span class="lv-av" aria-hidden="true">D</span><div class="lv-say">${q(m.client)}</div></div>${atts}</div>`;
    };
    const curM = C.moments[n - 1], lastA = (curM.attempts || []).slice(-1)[0];
    let ctl = "";
    if (C.done) {
      ctl = `${C.closing ? `<div class="lv-client"><span class="lv-av" aria-hidden="true">D</span><div class="lv-say">${q(C.closing)}</div></div>` : ""}
        <div class="lv-summary"><span class="lv-tag">Session summary</span>${esc(C.summary || "").split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join("")}</div>
        ${rateHTML(`live-${C.id}-sum`, { rkey, akeys: ["summary"], label: "How helpful was this session?", where: "Live session · Session summary", type: "Session summary", ai: [C.closing && `Dana: ${C.closing}`, C.summary].filter(Boolean).join("\n"), input: "" })}
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
        a.note = out.parts ? noteLabeled(out.parts) : out.text; a.parts = out.parts || null; if (out.safety) a.safety = true; C.phase = "choose";
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
    const html = `
      <div class="chips-row">${[["open", "Open now"], ["done", "Practiced"], ["all", "All 12 Reps"]].map(([k, l]) => `<button type="button" class="chip" data-chip="${k}" aria-pressed="${chip === k}">${l}</button>`).join("")}</div>
      ${list.length ? `<div class="room-grid">${list.map(({ r, open, practiced, n }) => {
        const tag = practiced ? `<span class="v6-pill sage">Practiced ${n}×</span>` : open ? (r.pending ? `<span class="v6-pill muted">Being written</span>` : `<span class="v6-pill blush">Open</span>`) : `<span class="v6-pill muted">Opens Week ${r.week}</span>`;
        const btn = open ? `<button type="button" class="v6-btn secondary small" data-go="rep/${r.id}">${r.pending ? "Preview the moment" : practiced ? "Practice again" : "Start Rep"}</button>` : `<button type="button" class="v6-btn secondary small" disabled>Locked</button>`;
        return `<div class="room-card${open ? "" : " locked"}"><div class="top"><span>Rep ${r.id} · ${esc(r.client)}</span>${tag}</div>
          <div class="m">${r.pending ? esc(r.moment) : r.roomMoment ? esc(r.roomMoment) : r.line ? q(r.line) : esc(r.stageLine) + " " + r.silence + " seconds of silence."}</div>
          <div class="meta">Week ${r.week} · ${esc(r.theme)} · ${esc(r.lesson)}</div><div class="go">${btn}</div></div>`;
      }).join("")}</div>` : `<div class="empty">Reps you save show up here. Start with Rep 1.1.</div>`}
      <div class="bonus-head"><h2 class="h">Bonus Reps</h2><p>Six extra moments, six different ways to practice. Always open.</p></div>
      <div class="room-grid">${BONUS().map(B => { const bx = (S.bonus || {})[B.id] || {}; return `<div class="room-card bonus-card"><div class="top"><span>${B.icon} ${esc(B.fmtLabel)}</span>${bx.saved ? `<span class="v6-pill sage">Practiced</span>` : `<span class="v6-pill blush">Open</span>`}</div>
        <div class="m">${q(B.line)}</div><div class="meta">${esc(B.client)}, ${B.age} · ${esc(B.setting)}</div><div class="go"><button type="button" class="v6-btn secondary small" data-go="bonus/${B.id}">${bx.saved ? "Practice again" : "Start"}</button></div></div>`; }).join("")}</div>`;
    return { html, tight: true };
  }

  /* ---------- Voice session (TESTING: preview account only) ---------- */
  const VS = { hist: [], clips: [], status: "idle", msg: "", stream: null, rec: null, raf: 0, audio: null, ms: [], voice: "aura-2-thalia-en", sum: null, sumErr: "", speed: "fast", fillers: [], parts: [], mode: "guided", g: null };
  const VG_TAG = { open: ["Dana opened up", "ok"], guarded: ["Dana stayed guarded", "mid"], pull: ["Dana pulled back", "back"] };
  const VS_VOICES = [["aura-2-thalia-en", "Thalia"], ["aura-2-andromeda-en", "Andromeda"], ["aura-2-helena-en", "Helena"], ["aura-2-luna-en", "Luna"], ["aura-2-cora-en", "Cora"], ["aura-2-delia-en", "Delia"], ["aura-2-asteria-en", "Asteria"], ["aura-2-athena-en", "Athena"]];
  const VS_MAX = 8;
  const vsOnPage = () => location.hash.startsWith("#voice") || location.hash.startsWith("#week/voice");
  function voiceView() {
    if (!isTestAccount()) return { html: `<div class="card"><p>Voice sessions aren’t open yet.</p></div>`, title: "Voice session" };
    if (VS.mode === "guided") return vgView();
    const st = VS.status, turns = VS.hist.filter(h => h.who === "me").length;
    const statusLine = { idle: "", opening: "Dana is getting ready…", speaking: "Dana is talking…", listening: "Your turn. Answer out loud. When you pause, Dana will reply.", thinking: "Dana is thinking…", done: "Session complete." }[st] || "";
    const lines = VS.hist.map((h, i) => h.who === "client"
      ? `<div class="vs-line c"><span class="av" aria-hidden="true">D</span><div><small>Dana</small>${q(h.text)}</div></div>`
      : `<div class="vs-line me"><div><small>You</small>${esc(h.text)}${h.clip ? `<audio controls preload="none" src="${h.clip}"></audio>` : ""}</div></div>`).join("");
    const html = `<div class="card stack">
      <div class="rep-top"><span class="v6-pill blush">🎙 Voice session · Testing</span><span class="lesson">Only your preview account can see this</span></div>
      ${st === "idle" ? `<p class="flow-q">A spoken mock session with Dana.</p>
        <p class="flow-sub">Dana, 34, is an ER nurse in session 6. She didn’t do last week’s homework, and she’s guarded. She’ll speak first. Answer out loud, like you would in session. When you stop talking, she replies. Up to ${VS_MAX} back-and-forths. End anytime you think you’ve reached the goal.</p>
        <div class="vs-goal"><b>Your goal</b> Find out what really got in the way of the homework, without assigning anything new.<small><b>Stretch:</b> Dana shares what she’s afraid would happen if she slipped at work.</small></div>
        <ul class="vs-tips"><li>Use headphones so Dana’s voice doesn’t get picked up by your mic.</li><li>Your browser will ask to use your microphone.</li></ul>
        <div class="field"><b>Dana’s voice</b><small>Testing only: try a few and see which sounds most like Dana.</small><div class="chips-row">${VS_VOICES.map(([v, n]) => `<button type="button" class="chip" data-vs-voice="${v}" aria-pressed="${VS.voice === v}">${n}</button>`).join("")}</div></div>
        <div class="field"><b>Dana’s thinking</b><small>Testing only: Fast replies quicker, Smart follows you more closely.</small><div class="chips-row"><button type="button" class="chip" data-vs-speed="fast" aria-pressed="${VS.speed === "fast"}">Fast</button><button type="button" class="chip" data-vs-speed="smart" aria-pressed="${VS.speed === "smart"}">Smart</button></div></div>
        <div class="actions" style="justify-content:space-between"><button type="button" class="v6-btn primary" data-vs-start>Start the session</button><button type="button" class="v6-link" data-vs-mode="guided">Back to the guided session</button></div>` : ""}
      ${st !== "idle" ? `<div class="vs-goal sm"><b>Goal</b> Find out what really got in the way of the homework, without assigning anything new.</div>` : ""}
      ${VS.msg ? `<div class="banner-soft">${esc(VS.msg)}</div>` : ""}
      ${lines ? `<div class="vs-log">${lines}</div>` : ""}
      ${st !== "idle" ? `<div class="vs-status ${st}"><span class="vs-dot"></span><span>${statusLine}</span>${st === "listening" ? `<span class="vs-meter"><i data-vs-meter></i></span>` : ""}</div>
        <div class="actions" style="justify-content:space-between">${st === "listening" ? `<button type="button" class="v6-btn primary" data-vs-done>I’m done talking</button>` : "<span></span>"}
        ${st !== "done" ? `<button type="button" class="v6-btn secondary" data-vs-end>End session</button>` : `<button type="button" class="v6-btn secondary" data-vs-again>Start over</button>`}</div>` : ""}
      ${st === "done" ? vsSummaryHTML() : ""}
    </div>`;
    return { html, title: "Voice session", sub: "Testing: a spoken mock session with Dana.", solo: true };
  }
  function vgView() {
    const G = VS.g || {}, sc = G.script, st = VS.status, n = sc ? sc.moments.length : 5, i = G.i || 0, m = sc && sc.moments[Math.min(i, n - 1)];
    const voicePick = `<div class="field"><b>Dana’s voice</b><small>Testing only.</small><div class="chips-row">${VS_VOICES.map(([v, nm]) => `<button type="button" class="chip" data-vs-voice="${v}" aria-pressed="${VS.voice === v}">${nm}</button>`).join("")}</div></div>`;
    if (st === "idle") return { html: `<div class="card stack">
      <div class="rep-top"><span class="v6-pill blush">🎙 Voice session</span><span class="lesson">About 12–15 minutes</span></div>
      <p class="flow-q">A spoken session with Dana, in five moments.</p>
      <p class="flow-sub">Dana, 34, is an ER nurse in session 6. Last week you suggested a thought record. She didn’t do it, and she walks in guarded. Each moment practices one skill from the course. Answer out loud; Dana responds to how it lands.</p>
      <div class="vs-goal"><b>Your goal</b> Find out what really got in the way of the homework, without assigning anything new.<small><b>Stretch:</b> Dana shares what she’s afraid would happen if she slipped at work.</small></div>
      <ul class="vs-tips"><li>Use headphones so Dana’s voice doesn’t get picked up by your mic.</li><li>Your browser will ask to use your microphone.</li></ul>
      ${VS.msg ? `<div class="banner-soft">${esc(VS.msg)}</div>` : ""}
      ${isTestAccount() ? voicePick : ""}
      <div class="actions" style="justify-content:space-between"><button type="button" class="v6-btn primary" data-vg-start>Start the session</button><span style="display:flex;gap:14px;flex-wrap:wrap"><button type="button" class="v6-link" data-vg-type>No mic? Type your answers instead</button>${isTestAccount() ? `<button type="button" class="v6-link" data-vs-mode="open">Open conversation (testing)</button>` : ""}</span></div>
    </div>`, title: "Voice session", sub: "Testing: a spoken mock session with Dana.", solo: true };
    const lines = VS.hist.map(h => h.who === "client"
      ? `<div class="vs-line c"><span class="av" aria-hidden="true">D</span><div><small>Dana</small>${q(h.text)}</div></div>`
      : `<div class="vs-line me"><div><small>You${h.skill ? ` · ${esc(h.skill)}` : ""}</small>${esc(h.text)}${h.clip ? `<audio controls preload="none" src="${h.clip}"></audio>` : ""}${h.pick ? `<span class="vg-tag ${VG_TAG[h.pick][1]}">${VG_TAG[h.pick][0]}</span>` : ""}</div></div>`).join("");
    const statusLine = { opening: "Getting Dana ready…", speaking: "Dana is talking…", listening: "Your turn. Answer out loud.", thinking: "Dana is thinking…", between: "Getting the next moment ready…", review: "", done: "" }[st] || "";
    const last = VS.hist.length >= 2 ? VS.hist[VS.hist.length - 2] : null;
    const review = st === "review" && last && last.who === "me" ? `<div class="vg-review ${VG_TAG[last.pick][1]}"><span class="vg-tag ${VG_TAG[last.pick][1]}">${VG_TAG[last.pick][0]}</span>${last.note ? `<p>${esc(last.note)}</p>` : ""}
      <div class="actions" style="justify-content:space-between"><button type="button" class="v6-btn secondary" data-vg-retry>↺ Try this moment again</button><button type="button" class="v6-btn primary" data-vg-adv>${i + 1 >= n ? "Finish the session →" : "Next moment →"}</button></div></div>` : "";
    const hint = st === "listening" && m ? (G.hint ? `<div class="vg-hint"><b>Nudge</b> ${esc(m.hint || m.focus)}</div>` : `<button type="button" class="v6-link vg-hintbtn" data-vg-hint>Need a nudge?</button>`) : "";
    const momentHead = m && st !== "done" ? `<div class="vg-moment"><span class="v6-label">Moment ${Math.min(i, n - 1) + 1} of ${n} · ${esc(m.skill)}</span><div class="vg-focus">${esc(m.focus)}</div></div>` : "";
    const nextBox = st === "between" && sc && sc.moments[i] ? `<div class="vg-next"><span class="v6-label">Up next · Moment ${i + 1} of ${n}</span><b>${esc(sc.moments[i].skill)}</b><span>${esc(sc.moments[i].focus)}</span><div class="actions"><button type="button" class="v6-btn primary" data-vg-next${G.ready && G.ready[i] ? "" : " disabled"}>${G.ready && G.ready[i] ? "Next moment →" : "Getting it ready…"}</button></div></div>` : "";
    const recap = st === "done" && G.picks && G.picks.length ? `<div class="vg-recap"><span class="v6-label">How each moment landed</span>${G.picks.map((p, k) => `<div class="r"><span>${k + 1}. ${esc(sc.moments[k].skill)}</span><span class="vg-tag ${VG_TAG[p][1]}">${VG_TAG[p][0]}</span></div>`).join("")}</div>` : "";
    return { html: `<div class="card stack">
      <div class="rep-top"><span class="v6-pill blush">🎙 Session with Dana</span><span class="lesson">Goal: what really got in the way of the homework</span></div>
      ${st === "between" || st === "review" ? "" : momentHead}
      ${VS.msg ? `<div class="banner-soft">${esc(VS.msg)}</div>` : ""}
      ${lines ? `<div class="vs-log">${lines}</div>` : ""}
      ${review}${nextBox}
      ${hint}
      ${st === "listening" && VS.typed ? `<label class="field"><b>Your turn. Type what you’d say.</b><textarea class="v6-ta" rows="3" data-vg-text placeholder="Write it the way you’d say it out loud"></textarea></label>` : statusLine ? `<div class="vs-status ${st}"><span class="vs-dot"></span><span>${st === "listening" ? statusLine : statusLine}</span>${st === "listening" ? `<span class="vs-meter"><i data-vs-meter></i></span>` : ""}</div>` : ""}
      <div class="actions" style="justify-content:space-between">${st === "listening" ? (VS.typed ? `<button type="button" class="v6-btn primary" data-vg-send>Send</button>` : `<button type="button" class="v6-btn primary" data-vs-done>I’m done talking</button>`) : "<span></span>"}
        ${st !== "done" ? `<button type="button" class="v6-btn secondary" data-vs-end>End session</button>` : `<button type="button" class="v6-btn secondary" data-vs-again>Start over</button>`}</div>
      ${recap}
      ${st === "done" ? vsSummaryHTML() : ""}
    </div>`, title: "Voice session", sub: "Testing: a spoken mock session with Dana.", solo: true };
  }
  async function vgPrep(i) {
    const G = VS.g; if (!G || i >= G.script.moments.length || (G.audio[i])) return;
    try { const { out } = await api("/.netlify/functions/lab-voice", { action: "gprep", scenario: "dana", voice: VS.voice, i }); if (out.ok && VS.g === G) { G.audio[i] = out.audio; G.ready[i] = true; if (VS.status === "between" && vsOnPage()) render(); } } catch (e) {}
  }
  async function vgStart(typed) {
    VS.hist = []; VS.ms = []; VS.parts = []; VS.msg = ""; VS.sum = null; VS.sumErr = ""; VS.typed = !!typed;
    if (!typed) {
      try { VS.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { VS.typed = true; VS.msg = "We couldn’t reach your microphone, so you’ll type your answers. Dana will still talk."; }
    }
    vsSet("opening");
    try {
      const { out } = await api("/.netlify/functions/lab-voice", { action: "gstart", scenario: "dana", voice: VS.voice, sessionId: (VS.sid = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) });
      if (!out.ok) { vsStopAll(); return vsSet("idle", out.error || "Voice isn’t available right now."); }
      VS.g = { script: out.script, i: 0, picks: [], attempts: [], audio: { 0: out.audio }, ready: { 0: true }, id: VS.sid, started: new Date().toISOString() }; VS.fillers = [];
      vgPrep(1);
      await vgMoment();
    } catch (e) { vsStopAll(); vsSet("idle", "Voice isn’t available right now."); }
  }
  async function vgMoment() {
    const G = VS.g, m = G.script.moments[G.i];
    VS.hist.push({ who: "client", text: m.line }); vsSet("speaking"); await vsPlay(G.audio[G.i].line);
    if (VS.status === "speaking") vsListen();
  }
  async function vgSend(blob, typedText) {
    const G = VS.g; if (VS.status !== "listening" || !G) return;
    vsSet("thinking", "");
    const b64 = blob ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1] || ""); fr.readAsDataURL(blob); }) : "";
    const t0 = Date.now();
    try {
      const { out } = await api("/.netlify/functions/lab-voice", { action: "gturn", text: typedText || "", sessionId: G.id, scenario: "dana", voice: VS.voice, i: G.i, history: VS.hist.map(h => ({ who: h.who === "me" ? "therapist" : "client", text: h.text })), audio: b64, mime: blob ? blob.type.split(";")[0] : "" });
      if (VS.status !== "thinking") return;
      if (!out.ok) { VS.msg = out.error || "Something went wrong. Try again."; return vsListen(); }
      if (out.retry) { VS.msg = "Dana didn’t catch that. Try saying it again."; return vsListen(); }
      VS.msg = ""; VS.ms.push(Date.now() - t0); if (out.parts) VS.parts.push(out.parts);
      const m = G.script.moments[G.i];
      const land = out.land || "guarded";
      G.picks[G.i] = land; G.note = out.note || ""; G.tries = (G.tries || 0) + 1;
      G.attempts.push({ moment: G.i + 1, skill: m.skill, said: out.heard, land, reply: out.reply, note: out.note || "" });
      VS.hist.push({ who: "me", text: out.heard, clip: blob ? URL.createObjectURL(blob) : "", pick: land, skill: m.skill, note: out.note || "" });
      VS.hist.push({ who: "client", text: out.reply });
      const tryNo = G.attempts.filter(a => a.moment === G.i + 1).length, ext = blob ? (blob.type.split("/")[1] || "webm").split(";")[0] : "";
      const logged = vgLog("In progress");
      if (logged && blob) logged.then(() => api("/.netlify/functions/lab-voice", { action: "clip", scenario: "dana", sessionId: G.id, name: `m${G.i + 1}-try${tryNo}.${ext}`, mime: blob.type.split(";")[0], audio: b64 })).catch(() => {});
      vsSet("speaking"); await vsPlay(out.audio);
      if (VS.status !== "speaking") return;
      vsSet("review");
    } catch (e) { VS.msg = "Connection hiccup. Try again."; vsListen(); }
  }
  /* after a moment: try it again, or move on */
  function vgRetry() {
    const G = VS.g; if (!G) return;
    VS.hist.splice(-2, 2); G.note = ""; G.hint = false;
    vsListen();
  }
  /* save the session to Airtable (Voice Sessions): in progress after each moment, then completed/ended with the breakdown */
  function vgLog(status) {
    const G = VS.g; if (!G) return;
    const S2 = VS.sum, breakdown = S2 ? [S2.goal && `Goal: ${S2.goal}`, S2.arc, S2.well.length && `What went well:\n- ${S2.well.join("\n- ")}`, S2.build.length && `What to build next:\n- ${S2.build.join("\n- ")}`, S2.noticed.length && `What I noticed:\n- ${S2.noticed.join("\n- ")}`, S2.next && `Practice next: ${S2.next}`].filter(Boolean).join("\n\n") : "";
    const avgWait = VS.ms.length ? VS.ms.reduce((a, b) => a + b, 0) / VS.ms.length / 1000 : 0;
    return api("/.netlify/functions/lab-voice", { action: "log", scenario: "dana", sessionId: G.id, started: G.started, status, picks: G.picks, attempts: G.attempts, history: VS.hist.map(h => ({ who: h.who === "me" ? "therapist" : "client", text: h.text })), breakdown, avgWait }).catch(() => {});
  }
  async function vgAdvance() {
    const G = VS.g; if (!G) return;
    G.note = ""; G.hint = false; G.tries = 0;
    try {
      G.i++;
      if (G.i >= G.script.moments.length) {
        const warm = G.picks.filter(p => p === "open").length >= 3, last = G.audio[G.i - 1];
        VS.hist.push({ who: "client", text: G.script.closings[warm ? "warm" : "flat"] });
        render(); await vsPlay(last[warm ? "warm" : "flat"] || "");
        S.voice = { done: true, at: Date.now(), items: G.script.moments.map((mm, k) => { const a = [...G.attempts].reverse().find(x => x.moment === k + 1); return { skill: mm.skill, line: mm.line, said: a ? a.said : "" }; }) };
        S.steps.voice = true; save();
        vsStopAll(); vsSet("done", ""); return vsWrap();
      }
      vgPrep(G.i + 1);
      if (G.ready[G.i]) vgMoment(); else vsSet("between");
    } catch (e) { vsSet("between"); }
  }
  function vsSummaryHTML() {
    const avg = a => (a.reduce((x, y) => x + y, 0) / a.length / 1000).toFixed(1);
    const wait = VS.ms.length ? `<small class="vs-wait">Average wait for Dana (${VS.speed === "smart" ? "Smart" : "Fast"}): ${avg(VS.ms)} seconds${VS.parts.length ? ` · listening ${avg(VS.parts.map(p => p.listen))}s, thinking ${avg(VS.parts.map(p => p.think))}s, voice ${avg(VS.parts.map(p => p.voice))}s, plus sending it back and forth` : ""}.</small>` : "";
    if (!VS.hist.some(h => h.who === "me")) return wait;
    if (VS.sumErr) return `<div class="banner-soft">${esc(VS.sumErr)} <button type="button" class="v6-link" data-vs-sum>Try again</button></div>${wait}`;
    if (!VS.sum) return `<div class="vs-status thinking"><span class="vs-dot"></span><span>Putting together your session breakdown…</span></div>${wait}`;
    const S2 = VS.sum, li = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return `<div class="vs-sum"><span class="v6-label forest">Your session breakdown</span>
      ${S2.goal ? `<div class="blk next"><b>Your goal</b><p>${esc(S2.goal)}</p></div>` : ""}
      ${S2.arc ? `<p class="arc">${esc(S2.arc)}</p>` : ""}
      ${S2.well.length ? `<div class="blk well"><b>What went well</b>${li(S2.well)}</div>` : ""}
      ${S2.build.length ? `<div class="blk build"><b>What to build next</b>${li(S2.build)}</div>` : ""}
      ${S2.noticed.length ? `<div class="blk"><b>What I noticed</b>${li(S2.noticed)}</div>` : ""}
      ${S2.next ? `<div class="blk next"><b>Practice next</b><p>${esc(S2.next)}</p></div>` : ""}
      <small class="vs-wait">In the full version, this recording and transcript also go to Tiffany for feedback.</small>${wait}</div>`;
  }
  async function vsWrap() {
    VS.sum = null; VS.sumErr = "";
    if (!VS.hist.some(h => h.who === "me")) return;
    try {
      const { out } = await api("/.netlify/functions/lab-voice", { action: "wrap", scenario: "dana", picks: VS.mode === "guided" && VS.g ? VS.g.picks : [], retries: VS.mode === "guided" && VS.g ? Math.max(0, VS.g.attempts.length - VS.g.picks.filter(Boolean).length) : 0, history: VS.hist.map(h => ({ who: h.who === "me" ? "therapist" : "client", text: h.text })) });
      if (out.ok) VS.sum = out.summary; else VS.sumErr = out.error || "The breakdown didn’t come through.";
      if (VS.mode === "guided" && VS.g) vgLog(VS.g.picks.filter(Boolean).length >= VS.g.script.moments.length ? "Completed" : "Ended early");
    } catch (e) { VS.sumErr = "The breakdown didn’t come through."; }
    if (vsOnPage()) render();
  }
  const vsPlay = b64 => new Promise(res => { if (!b64) return res(); try { const a = new Audio("data:audio/mpeg;base64," + b64); VS.audio = a; a.onended = res; a.onerror = res; a.play().catch(res); } catch (e) { res(); } });
  const vsSet = (st, msg) => { VS.status = st; if (msg !== undefined) VS.msg = msg; if (vsOnPage()) render(); };
  function vsStopAll() {
    cancelAnimationFrame(VS.raf); VS.raf = 0;
    try { if (VS.rec && VS.rec.state !== "inactive") { VS.rec.onstop = null; VS.rec.stop(); } } catch (e) {}
    try { VS.audio && VS.audio.pause(); } catch (e) {}
    try { VS.stream && VS.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    VS.stream = null; VS.rec = null;
  }
  async function vsListen() {
    if (VS.mode === "guided" && VS.typed) { vsSet("listening"); setTimeout(() => { const t = $("[data-vg-text]"); if (t) t.focus(); }, 50); return; }
    if (VS.mode !== "guided" && VS.hist.filter(h => h.who === "me").length >= VS_MAX) { vsStopAll(); vsSet("done", ""); return vsWrap(); }
    vsSet("listening");
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(VS.stream, mime ? { mimeType: mime } : {}), chunks = [];
    VS.rec = rec; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const bl = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" }); VS.mode === "guided" ? vgSend(bl) : vsSend(bl); };
    rec.start(250);
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), src = ctx.createMediaStreamSource(VS.stream), an = ctx.createAnalyser();
    an.fftSize = 1024; src.connect(an); const buf = new Uint8Array(an.fftSize);
    let spoke = false, quietSince = 0; const t0 = Date.now();
    const tick = () => {
      if (VS.rec !== rec || rec.state === "inactive") { ctx.close(); return; }
      an.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += (v - 128) * (v - 128);
      const rms = Math.sqrt(sum / buf.length), now = Date.now(), m = document.querySelector("[data-vs-meter]");
      if (m) m.style.width = Math.min(100, rms * 4) + "%";
      if (rms > 6) { spoke = true; quietSince = 0; } else if (spoke && !quietSince) quietSince = now;
      if ((spoke && quietSince && now - quietSince > 1600) || now - t0 > 90000) { rec.stop(); ctx.close(); return; }
      VS.raf = requestAnimationFrame(tick);
    };
    VS.raf = requestAnimationFrame(tick);
  }
  async function vsSend(blob) {
    if (VS.status !== "listening") return;
    vsSet("thinking", "");
    if (VS.fillers.length) { try { const f = new Audio("data:audio/mpeg;base64," + VS.fillers[Math.floor(Math.random() * VS.fillers.length)]); f.play().catch(() => {}); } catch (e) {} }
    const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1] || ""); fr.readAsDataURL(blob); });
    const t0 = Date.now();
    try {
      const { out } = await api("/.netlify/functions/lab-voice", { action: "turn", scenario: "dana", voice: VS.voice, speed: VS.speed, audio: b64, mime: blob.type.split(";")[0], history: VS.hist.map(h => ({ who: h.who === "me" ? "therapist" : "client", text: h.text })) });
      if (VS.status !== "thinking") return;
      if (!out.ok) { vsSet("listening", out.error || "Something went wrong. Try again."); return vsListen(); }
      if (out.retry) { VS.msg = "Dana didn’t catch that. Try saying it again."; return vsListen(); }
      VS.ms.push(Date.now() - t0); if (out.parts) VS.parts.push(out.parts);
      VS.hist.push({ who: "me", text: out.heard, clip: URL.createObjectURL(blob) });
      VS.hist.push({ who: "client", text: out.text });
      if (out.safety) { vsStopAll(); vsSet("done", ""); return; }
      vsSet("speaking"); await vsPlay(out.audio);
      if (VS.status === "speaking") vsListen();
    } catch (e) { vsSet("listening", "Connection hiccup. Try again."); vsListen(); }
  }
  async function vsStart() {
    VS.hist = []; VS.ms = []; VS.parts = []; VS.msg = ""; VS.sum = null; VS.sumErr = "";
    try { VS.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { return vsSet("idle", "Your microphone isn’t available. Check your browser’s permission for this site and try again."); }
    vsSet("opening");
    try {
      const { out } = await api("/.netlify/functions/lab-voice", { action: "open", scenario: "dana", voice: VS.voice });
      if (!out.ok) { vsStopAll(); return vsSet("idle", out.error || "Voice isn’t available right now."); }
      VS.fillers = out.fillers || [];
      VS.hist.push({ who: "client", text: out.text }); vsSet("speaking"); await vsPlay(out.audio);
      if (VS.status === "speaking") vsListen();
    } catch (e) { vsStopAll(); vsSet("idle", "Voice isn’t available right now."); }
  }

  /* ---------- Bonus Reps (lab-v6-bonus.js) ---------- */
  const BONUS = () => window.TCC6_BONUS || [];
  let bxTimer = null;
  function bonusView(id) {
    const B = BONUS().find(b => b.id === id) || BONUS()[0];
    S.bonus = S.bonus || {}; const x = S.bonus[B.id] = S.bonus[B.id] || {};
    const AU = window.TCC6_BONUS_AUDIO || { ready: [] };
    const has = f => (x[f] || "").trim().length >= 3;
    const heard = c => !!(x.heard || {})[c];
    const spk = (line, stage) => `<div class="speaker boxed"><span class="av" aria-hidden="true">${B.client[0]}</span><span class="col"><span class="who">${esc(B.client)}</span>${stage ? `<span class="stage">${esc(stage)}</span>` : ""}<span class="said md">${q(line)}</span></span></div>`;
    const play = (code, label) => `<button type="button" class="v6-btn primary bx-play" data-bx-play="${code}">▶ ${esc(label)}</button>${AU.ready.includes(code) ? "" : `<small class="bx-soon">Audio coming soon. For now, the words appear when you press play.</small>`}`;
    const ta = (f, ph, rows) => `<textarea class="v6-ta" rows="${rows || 3}" data-bx="${f}" placeholder="${esc(ph)}">${esc(x[f] || "")}</textarea>`;
    const chipB = (f, v, on) => `<button type="button" class="chip" data-bx-pick="${f}" data-v="${esc(v)}" aria-pressed="${on}">${esc(v)}</button>`;
    const ai = f => aiBox(`bonus-${B.id}-${f}`, `Hear how ${B.client} responds`, "react", () => ({ who: `${B.client}, ${B.age}`, context: B.context, line: B.line, response: (x[f] || "").trim(), guide: B.guide || "" }), () => {}, { req: ["response"], who: B.client, wait: `${B.client} is responding…`, rkey: `bonus-${B.id}`, akeys: [], where: `Bonus · ${B.client}` });
    const takeBtn = ok => ok && !x.showTake ? `<div class="actions"><button type="button" class="v6-btn primary" data-bx-pick="showTake" data-v="1">See one way to handle it →</button></div>` : "";
    let body = "", ready = false;
    if (B.format === "listen") {
      const c = B.audio[0];
      body = !heard(c) ? `<p class="flow-q">Listen before you read.</p><p class="flow-sub">Notice how ${esc(B.client)} says it, not just what.</p><div class="bx-playrow">${play(c, "Hear " + B.client)}</div>`
        : spk(B.line, B.delivery) + `<div class="field"><b>${esc(B.hearQ)}</b><div class="chips-row">${B.hearOpts.map(o => chipB("hear", o, x.hear === o)).join("")}</div>${x.hear ? `<span class="hint">${esc(B.hearNote)}</span>` : ""}</div>`
          + (x.hear ? `<label class="field"><b>What do you say?</b>${ta("move", "Say it the way you’d actually say it")}</label>${has("move") ? ai("move") : ""}` : "");
      ready = x.hear && has("move");
    }
    if (B.format === "tones") {
      body = `<p class="flow-q">Same words, two ways.</p><p class="flow-sub">Hear each version, then write what you’d say to that one.</p>` + B.tones.map(([c, label, stage], i) => `<div class="bx-tone"><span class="v6-label">${esc(label)}</span>${heard(c) ? spk(B.line, stage) + `<label class="field">What would you say to this version?${ta("move" + i, "Your response", 2)}</label>` : `<div class="bx-playrow">${play(c, "Hear " + label.toLowerCase())}</div>`}</div>`).join("");
      ready = B.tones.every((_, i) => has("move" + i));
      if (ready) body += `<div class="reveal"><b>What changed?</b> ${esc(B.compare)}</div>${ai("move1")}`;
    }
    if (B.format === "rank") {
      const n = B.options.length;
      if (!x.order) { x.order = [...Array(n).keys()].sort(() => Math.random() - .5); save(); }
      body = spk(B.line) + `<p class="flow-q" style="margin-top:14px">Put these in order, from best fit to least.</p><p class="flow-sub">Use the arrows. There’s no score.</p>
        <ol class="bx-rank">${x.order.map((k, i) => `<li><span class="n">${i + 1}</span><span class="t">${q(B.options[k][0])}</span>${x.ranked ? "" : `<span class="mv"><button type="button" data-bx-mv="${i}:-1" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" data-bx-mv="${i}:1" aria-label="Move down"${i < n - 1 ? "" : " disabled"}>↓</button></span>`}</li>`).join("")}</ol>
        ${x.ranked ? `<div class="reveal"><b>How Tiffany would order them</b><ol class="bx-key">${B.options.map(([t, why], k) => `<li><span class="t">${q(t)}</span><small>${esc(why)}${x.order[k] === k ? " <b>You put this one in the same spot.</b>" : ""}</small></li>`).join("")}</ol></div>`
          : `<div class="actions"><button type="button" class="v6-btn primary" data-bx-pick="ranked" data-v="1">Lock in my order</button></div>`}`;
      ready = !!x.ranked;
    }
    if (B.format === "fix") {
      body = spk(B.line) + `<div class="you-said sm"><small>A therapist said</small>${q(B.original)}</div>
        <label class="field"><b>How would you say it?</b><small>It’s kind and natural. What would you change? Rewrite it your way.</small>${ta("move", "Your version")}</label>
        ${has("move") ? `<div class="reveal"><b>About the original</b> ${esc(B.originalNote)}</div>${ai("move")}` : ""}`;
      ready = has("move");
    }
    if (B.format === "spot") {
      const sp = x.spot || {};
      body = spk(B.line) + `<p class="flow-q" style="margin-top:14px">Three therapists answered. Which Pull drove each one?</p>` + B.responses.map(([t, pull, why], i) => `<div class="bx-spot"><div class="you-said sm"><small>Therapist ${i + 1}</small>${q(t)}</div>
        <div class="chips-row">${D.PULLS.map(([p]) => `<button type="button" class="chip" data-bx-spot="${i}" data-v="${p}" aria-pressed="${sp[i] === p}">${p}</button>`).join("")}</div>
        ${sp[i] ? `<span class="hint">${sp[i] === pull ? "✓ " : `Most people would call this <b>${pull}</b>. `}${esc(why)}</span>` : ""}</div>`).join("");
      const allSpot = B.responses.every((_, i) => sp[i]);
      if (allSpot) body += `<label class="field" style="margin-top:8px"><b>Your turn. What would you say to ${esc(B.client)}?</b>${ta("move", "Say it the way you’d actually say it")}</label>${has("move") ? ai("move") : ""}`;
      ready = allSpot && has("move");
    }
    if (B.format === "clock") {
      const left = x.started && !x.timeUp ? Math.max(0, Math.ceil(B.seconds - (Date.now() - x.started) / 1000)) : 0;
      if (x.started && !x.timeUp && left <= 0) { x.timeUp = true; save(); }
      if (!x.started) body = `<p class="flow-q">You’ll have ${B.seconds} seconds to respond, like in a real session.</p><p class="flow-sub">Don’t overthink it. Type what you’d actually say.</p><div class="actions"><button type="button" class="v6-btn primary" data-bx-start>Start the clock</button></div>`;
      else if (!x.timeUp) body = spk(B.line) + `<div class="bx-clock"><b data-bx-count>${left}</b> seconds</div>${ta("first", "Type fast…", 2)}`;
      else body = spk(B.line) + `<div class="you-said sm"><small>Your first ${B.seconds} seconds</small>${(x.first || "").trim() ? q(x.first) : "(Time ran out. That happens in real sessions too.)"}</div>
        <label class="field"><b>Now take a breath. Same moment, no clock.</b><small>What would you say with a little more space?</small>${ta("move", "Your second try")}</label>${has("move") ? ai("move") : ""}
        ${has("move") ? `<div class="reveal sm"><b>Compare</b> What changed between your first ${B.seconds} seconds and your second try? That gap is what a pause buys you.</div>` : ""}`;
      ready = x.timeUp && has("move");
    }
    const take = `<div class="card sage stack-12 take"><span class="v6-label forest">One way to handle it</span><div class="pull">${esc(B.take.text)}</div>
      <div class="say"><small>One way to say it</small><div>${q(B.take.say)}</div></div><div class="why"><b>Watch for</b> ${esc(B.take.watch)}</div></div>
      <div class="card stack-12"><span class="v6-label">Your line to keep</span><label class="field"><small>${esc(B.bank)}…</small>${ta("line", "Your best line, in your own words", 2)}</label>
        ${x.saved ? `<div class="saved-box"><span><b>✓ Saved</b> to your Playbook.</span><button type="button" class="v6-link" data-go="reproom">Back to the Rep Room</button></div>` : `<div class="actions"><button type="button" class="v6-btn primary" data-bx-save${(x.line || "").trim() ? "" : " disabled"}>Save to “What I Say When…”</button></div>`}</div>`;
    const html = `<div class="card stack"><div class="rep-top"><span class="v6-pill blush">${B.icon} ${esc(B.fmtLabel)}</span><span class="lesson">${esc(B.client)}, ${B.age} · ${esc(B.setting)}</span></div>
      <div class="rep-ctx">${esc(B.context)}</div>${body}${takeBtn(ready)}</div>${ready && x.showTake ? take : ""}`;
    return { html, title: `Bonus · ${B.client}`, sub: B.sub, crumb: ["Rep Room", `Bonus · ${B.client}`, "reproom"], solo: true };
  }

  /* ---------- Playbook ---------- */
  function playbookView() {
    const lines = bankLines();
    const blines = BONUS().filter(B => ((S.bonus || {})[B.id] || {}).saved && (S.bonus[B.id].line || "").trim());
    const html = `<div class="card">
        <div class="between" style="margin-bottom:6px"><h2 class="pb-title">What I Say When…</h2><span style="font-size:13px;font-weight:600;color:var(--forest)">${lines.length} of 12+ lines</span></div>
        <p class="note" style="margin:0 0 16px;font-size:14px">Your best line from every Rep, in your own words. Three new lines each week.</p>
        ${lines.length ? `<div class="bank">${lines.map(r => `<div class="bank-item"><span class="w">${esc(r.bank)}…</span><span class="l">${q(S.reps[r.id].line)}</span><span class="f">Rep ${r.id} · ${esc(r.client)}<button type="button" data-go="rep/${r.id}">Edit</button></span></div>`).join("")}</div>`
          : `<div class="empty">Your first line lands here after the Lesson 1 Rep.</div>`}
        ${blines.length ? `<div class="bank" style="margin-top:12px">${blines.map(B => `<div class="bank-item"><span class="w">${esc(B.bank)}…</span><span class="l">${q(S.bonus[B.id].line)}</span><span class="f">Bonus · ${esc(B.client)}<button type="button" data-go="bonus/${B.id}">Practice again</button></span></div>`).join("")}</div>` : ""}
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
      $$("[data-play]", app).forEach(b => b.onclick = () => playConvo(+b.dataset.play));
      if (D2()) {
        const st = d2State(), m = D2().moments[st.i], N = st.i + 1, ab = "abc";
        const hb = $$("[data-d2-hear]", app); hb.forEach(b => b.onclick = async () => { if (b.dataset.d2Hear === "text") { st.heard[st.i] = true; save(); return render(); } if (m.pause && !b.dataset.playing) { b.disabled = true; b.textContent = "…"; await new Promise(r => setTimeout(r, 2500)); b.disabled = false; } d2Btn(b, [[`m${N}-jordan`, m.line]], ok => { if (ok) { st.heard[st.i] = true; save(); render(); } }); });
        $$("[data-d2-opt]", app).forEach(b => b.onclick = () => { const k = +b.dataset.d2Opt;
          /* one second of listening unlocks "I'd say" for that option, no need to wait for the end */
          if (!b.dataset.playing) { const at = st.i; setTimeout(() => { if (!b.dataset.playing || st.i !== at) return; st.ho = st.ho || {}; (st.ho[at] = st.ho[at] || {})[k] = true; const c = b.closest(".d2-card"), pb = c && c.querySelector("[data-d2-pick]"); if (c) c.classList.add("heard"); if (pb) pb.disabled = false; }, 1000); }
          d2Btn(b, [[`m${N}-${ab[k]}`, m.opts[k]]], ok => { if (ok) { st.ho = st.ho || {}; (st.ho[st.i] = st.ho[st.i] || {})[k] = true; save(); render(); } else if ((st.ho[st.i] || {})[k]) save(); }); });
        $$("[data-d2-tk]", app).forEach(d => d.ontoggle = () => { st.tko = st.tko || {}; (st.tko[st.i] = st.tko[st.i] || {})[d.dataset.d2Tk] = d.open; save(); });
        $$("[data-d2-pick]", app).forEach(b => b.onclick = async () => { const k = +b.dataset.d2Pick; st.pick[st.i] = k; save(); render(); d2ToRun(); await d2Play([[`m${N}-r${ab[k]}`, m.reacts[k]]]); if (st.pick[st.i] === k && !st.played[st.i]) { const y = scrollY; st.played[st.i] = true; save(); render(); scrollTo(0, y); } });
        $$("[data-d2-stop]", app).forEach(b => b.onclick = () => d2Stop());
        $$("[data-d2-other]", app).forEach(b => b.onclick = () => { const k = +b.dataset.d2Other; d2Btn(b, [[`m${N}-${ab[k]}`, m.opts[k]], [`m${N}-r${ab[k]}`, m.reacts[k]]], ok => { if (ok) { (st.others[st.i] = st.others[st.i] || {})[k] = true; st.tko = st.tko || {}; (st.tko[st.i] = st.tko[st.i] || {})["o" + k] = true; save(); render(); } }); });
        $$("[data-d2-replay]", app).forEach(b => b.onclick = () => d2Btn(b, [[b.dataset.d2Replay, ""]], null, "❚❚"));
        const wt = $("[data-d2-words]", app); if (wt) wt.onclick = () => { st.words = !st.words; save(); render(); };
        const nx = $("[data-d2-next]", app); if (nx) nx.onclick = () => { d2Run++; st.i++; if (st.i >= D2().moments.length) S.demo.watched = true; save(); render(); };
        const rs = $("[data-d2-restart]", app); if (rs) rs.onclick = () => { d2Run++; S.demo.d2 = { i: 0, heard: {}, pick: {}, played: {}, others: {}, ho: {}, words: !!(S.demo.d2 || {}).words }; save(); render(); };
      }
      $$("[data-showtext]", app).forEach(b => b.onclick = () => { convoRun++; S.demo.heard = { ...(S.demo.heard || {}), [+b.dataset.showtext]: true }; save(); render(); });
      $$("[data-act]", app).forEach(b => b.onclick = () => {
        const k = b.dataset.key, act = b.dataset.act;
        if (act === "welcome") { S.welcome = !S.welcome; }
        if (act === "watch") { S.watched[k] = !S.watched[k]; }
        if (act === "demowatch") { S.demo.watched = !S.demo.watched; }
        if (act === "demonext") { const W = ACTS.demo.walk; S.demo.step = (S.demo.step || 0) + 1; if (S.demo.step >= W.length) { S.demo.watched = true; S.demo.step = W.length - 1; } }
        if (act === "demoreset") { S.demo.step = 0; S.demo.watched = false; S.demo.heard = {}; }
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
      $$("[data-demo]", app).forEach(t => t.oninput = () => { S.demo[t.dataset.demo] = t.value; save(); const b = $("[data-act=demosave]", app); if (b) b.disabled = !(S.demo.watched && S.demo.pull && (S.demo.line || "").trim().length >= 3); });
      $$("[data-demo-pull]", app).forEach(b => b.onclick = () => { S.demo.pull = b.dataset.demoPull; save(); render(); });
      const rc = $("[data-d2-rec]", app); if (rc) rc.onclick = d2Record;
      $$("[data-demo-ck]", app).forEach(b => b.onclick = () => { S.demo.ck = b.dataset.demoCk; save(); render(); });
      $$("[data-r]", app).forEach(t => t.oninput = t.onchange = () => { S.reflect[t.dataset.r] = t.value; save(); });
      $$("[data-pullchip]", app).forEach(b => b.onclick = () => { S.reflect.pullPick = b.dataset.pullchip; save(); $$("[data-pullchip]", app).forEach(c => c.setAttribute("aria-pressed", c === b)); });
      $$("[data-p]", app).forEach(t => t.oninput = () => { S.profile[t.dataset.p] = t.value; save(); });
      /* Lab */
      const L = S.lab, top = () => { const f = $(".flow", app); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" }); };
      $$("[data-lab-turn]", app).forEach(b => b.onclick = () => { L.turnPick = +b.dataset.labTurn; save(); render(); });
      $$("[data-lab-spot]", app).forEach(b => b.onclick = () => { const n = +b.dataset.labSpot; L.spotPick = n; if (n !== D.LAB.spot) L.spotTries = (L.spotTries || 0) + 1; L.turnPick = D.LAB.turn; save(); render(); });
      $$("[data-lab-clue]", app).forEach(b => b.onclick = () => { L.clues = { ...(L.clues || {}), [b.dataset.labClue]: !(L.clues || {})[b.dataset.labClue] }; save(); render(); });
      $$("[data-lab-clues]", app).forEach(b => b.onclick = () => { L.cluesDone = true; save(); render(); });
      $$("[data-lab-check]", app).forEach(t => t.oninput = () => { L.check = t.value; save(); const n = $('[data-lab-nav="1"]', app); if (n) n.disabled = !(D.LAB.sort.every((_, i) => (L.sort || {})[i]) && t.value.trim().length >= 8); });
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
      $$("[data-rf-rep]", app).forEach(b => b.onclick = () => { if (F.rep !== b.dataset.rfRep) { F.rep = b.dataset.rfRep; F.c3 = {}; } save(); render(); });
      const C3 = () => (F.c3 = F.c3 || {});
            $$("[data-rf-words]", app).forEach(b => b.onclick = () => { C3().used = b.dataset.rfWords; save(); render(); });
      $$("[data-rf-pl]", app).forEach(b => b.onclick = () => { C3().pl = b.dataset.rfPl; save(); render(); });
      $$("[data-rf3]", app).forEach(nd => { nd.oninput = () => { C3()[nd.dataset.rf3] = nd.value; save(); const nx = $("[data-rf-nav='1']", app); if (nx) nx.disabled = !rfOk3(); }; nd.onchange = () => render(); });
      $$("[data-rf]", app).forEach(t => t.oninput = () => { F[t.dataset.rf] = t.value; save(); const sv = $("[data-rf-save]", app); if (sv) sv.disabled = !((F.redoLine || "").trim() && (F.redo || "").trim()); });
      $$("[data-rf-nav]", app).forEach(b => b.onclick = () => { F.step = Math.max(0, Math.min(3, (F.step || 0) + +b.dataset.rfNav)); save(); render(); top(); });
      const rfs = $("[data-rf-save]", app); if (rfs) rfs.onclick = () => { S.steps.reflect = true; save(); render(); flash("Saved"); };
      const rfu = $("[data-rf-useline]", app); if (rfu) rfu.onclick = () => { const x = S.reps[String(F.rep).replace("rep:", "")]; if (x) { x.line = F.redoLine; x.saved = true; } save(); render(); flash("Playbook updated"); };
      /* Simulation */
      const M = S.sim, X = SIMS.jordan, C = M.cur;
      const ss = $("[data-sim-start]", app); if (ss) ss.onclick = () => { M.cur = newAttempt(X); save(); render(); top(); };
      $$("[data-sim-pick]", app).forEach(b => b.onclick = () => { C.picks[C.i] = +b.dataset.simPick; save(); render(); });
      const sr = $("[data-sim-resume]", app); if (sr) sr.onclick = () => { delete C.intro; save(); render(); top(); };
      const si = $("[data-sim-intro]", app); if (si) si.onclick = () => { C.intro = true; save(); render(); top(); };
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
      $$("[data-avm]", app).forEach(b => b.onclick = () => {
        const cur = Array.isArray(v[b.dataset.f]) ? v[b.dataset.f].slice() : [], o = b.dataset.avm, ex = "Not much yet";
        let nx = cur.includes(o) ? cur.filter(x => x !== o) : (o === ex ? [ex] : cur.filter(x => x !== ex).concat(o)); /* "Not much yet" stands alone */
        v[b.dataset.f] = nx; save(); render();
      });
      $$("[data-mv]", app).forEach(b => b.onclick = () => { const f = b.dataset.f; if (v[f + "c"]) return; const g = v[f] = v[f] || [], k = b.dataset.mv; const at = g.indexOf(k); at === -1 ? g.push(k) : g.splice(at, 1); save(); render(); });
      $$("[data-walk]", app).forEach(b => b.onclick = () => { const k = "w" + b.dataset.walk; v[k] = (v[k] || 1) + 1; save(); render(); });
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
    if (bxTimer) { clearInterval(bxTimer); bxTimer = null; }
    const onVoice = scr === "voice" || (scr === "week" && arg === "voice");
    if (!onVoice && VS.status !== "idle" && VS.status !== "done") { vsStopAll(); VS.status = "idle"; VS.g = null; VS.hist = []; }
    if (onVoice) {
      const b1 = $("[data-vs-start]", app); if (b1) b1.onclick = vsStart;
      const g1 = $("[data-vg-start]", app); if (g1) g1.onclick = () => vgStart(false);
      const g6 = $("[data-vg-type]", app); if (g6) g6.onclick = () => vgStart(true);
      const g7 = $("[data-vg-send]", app); if (g7) g7.onclick = () => { const t = $("[data-vg-text]", app), v = (t && t.value || "").trim(); if (v.length < 2) return; vgSend(null, v); };
      const g2 = $("[data-vg-next]", app); if (g2) g2.onclick = () => { if (VS.g && VS.g.ready[VS.g.i]) vgMoment(); };
      const g3 = $("[data-vg-retry]", app); if (g3) g3.onclick = vgRetry;
      const g4 = $("[data-vg-adv]", app); if (g4) g4.onclick = vgAdvance;
      const g5 = $("[data-vg-hint]", app); if (g5) g5.onclick = () => { VS.g.hint = true; render(); };
      $$("[data-vs-mode]", app).forEach(b => b.onclick = () => { VS.mode = b.dataset.vsMode; VS.msg = ""; render(); });
      const b2 = $("[data-vs-done]", app); if (b2) b2.onclick = () => { try { VS.rec && VS.rec.state !== "inactive" && VS.rec.stop(); } catch (e) {} };
      const b3 = $("[data-vs-end]", app); if (b3) b3.onclick = () => { vsStopAll(); vsSet("done", ""); vsWrap(); };
      const b5 = $("[data-vs-sum]", app); if (b5) b5.onclick = () => { VS.sumErr = ""; render(); vsWrap(); };
      $$("[data-vs-voice]", app).forEach(b => b.onclick = () => { VS.voice = b.dataset.vsVoice; render(); });
      $$("[data-vs-speed]", app).forEach(b => b.onclick = () => { VS.speed = b.dataset.vsSpeed; render(); });
      const b4 = $("[data-vs-again]", app); if (b4) b4.onclick = () => { vsStopAll(); VS.hist = []; VS.g = null; vsSet("idle", ""); };
    }
    if (scr === "bonus") {
      const B = BONUS().find(b => b.id === arg) || BONUS()[0], x = S.bonus[B.id], AU = window.TCC6_BONUS_AUDIO || { ready: [], base: "" };
      $$("[data-bx]", app).forEach(t => { t.oninput = () => { x[t.dataset.bx] = t.value; save(); const sv = $("[data-bx-save]", app); if (sv) sv.disabled = !(x.line || "").trim(); }; if (t.dataset.bx !== "line" && t.dataset.bx !== "first") t.onchange = () => render(); });
      $$("[data-bx-pick]", app).forEach(b => b.onclick = () => { x[b.dataset.bxPick] = b.dataset.v; save(); render(); });
      $$("[data-bx-play]", app).forEach(b => b.onclick = () => { const c = b.dataset.bxPlay; x.heard = x.heard || {}; if (AU.ready.includes(c)) { try {
          if (b.dataset.playing && b._au) { b._au.pause(); delete b.dataset.playing; b.textContent = "▶ Play"; return; } /* pause */
          const a = new Audio(AU.base + c + ".mp3"); b._au = a; a.onended = () => { x.heard[c] = true; save(); render(); }; a.play(); b.dataset.playing = "1"; b.textContent = "❚❚ Pause"; return; } catch (e) {} } x.heard[c] = true; save(); render(); });
      $$("[data-bx-mv]", app).forEach(b => b.onclick = () => { const [i, d] = b.dataset.bxMv.split(":").map(Number), o = x.order, j = i + d; [o[i], o[j]] = [o[j], o[i]]; save(); render(); });
      $$("[data-bx-spot]", app).forEach(b => b.onclick = () => { x.spot = x.spot || {}; x.spot[b.dataset.bxSpot] = b.dataset.v; save(); render(); });
      const st = $("[data-bx-start]", app); if (st) st.onclick = () => { x.started = Date.now(); save(); render(); const t = $("[data-bx=first]", app); if (t) t.focus(); };
      if (B.format === "clock" && x.started && !x.timeUp) bxTimer = setInterval(() => { const left = Math.ceil(B.seconds - (Date.now() - x.started) / 1000), el = $("[data-bx-count]", app); if (el) el.textContent = Math.max(0, left); if (left <= 0) { clearInterval(bxTimer); bxTimer = null; const t = $("[data-bx=first]", app); if (t) x.first = t.value; x.timeUp = true; save(); render(); } }, 250);
      const sv = $("[data-bx-save]", app); if (sv) sv.onclick = () => { x.saved = true; save(); render(); };
    }
    if (scr === "reproom") $$("[data-chip]", app).forEach(b => b.onclick = () => { chip = b.dataset.chip; render(); });
  }

  /* Global controls */
  $("[data-login-form]").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim().toLowerCase(), pw = f.password.value;
    const err = $("[data-login-error]");
    signedOutMsg = "";
    const enter = s => { sessionStorage.setItem(SESSION, JSON.stringify(s)); KEY = keyFor(s); loadAll(); err.textContent = ""; f.reset(); render(); };
    const btn = f.querySelector("button[type=submit]"), label = btn.innerHTML;
    btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
    fetch("/.netlify/functions/lab-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) })
      .then(r => r.json().catch(() => ({})))
      .then(j => { if (j.ok && j.token) enter({ email: j.email, first: j.first || "", test: !!j.test, token: j.token }); else err.textContent = j.message || "That didn’t work. Please try again."; })
      .catch(() => { err.textContent = "Sign-in is temporarily unavailable. Please try again."; })
      .finally(() => { btn.disabled = false; btn.innerHTML = label; });
  });
  $$("[data-back]").forEach(b => b.onclick = goBack);
  $$("[data-menu]").forEach(b => b.onclick = () => setMenu(!$(".v6-app").classList.contains("menu-open")));
  $$("[data-menu-close]").forEach(b => b.onclick = () => setMenu(false));
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  $("[data-sb-min]").onclick = () => { SB.min = !SB.min; sbSave(); render(); };
  $$("[data-signout]").forEach(b => b.onclick = () => { sessionStorage.removeItem(PREVIEW_SESSION); sessionStorage.removeItem(SESSION); render(); });
  if (location.hash === "#setup" && !session()) { const d = document.getElementById("setup"); if (d) d.open = true; }
  $$("[data-setup-open]").forEach(a => a.onclick = e => { e.preventDefault(); const d = $("#setup"); if (d) { d.open = true; d.querySelector("input").focus(); } });
  /* New student or forgot password: email a secure link to choose a password */
  const setup = $("[data-setup-form]");
  if (setup) setup.addEventListener("submit", e => {
    e.preventDefault();
    const email = setup.email.value.trim().toLowerCase(), msg = $("[data-setup-msg]"), btn = setup.querySelector("button");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Enter the email you used to buy the Lab."; return; }
    btn.disabled = true; msg.textContent = "Sending…";
    fetch("/.netlify/functions/course-activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      .then(r => r.json().catch(() => ({})))
      .then(j => { msg.textContent = j.message || (j.ok ? "Check your email for your link." : "That didn’t send. Please try again."); })
      .catch(() => { msg.textContent = "That didn’t send. Please try again."; })
      .finally(() => { btn.disabled = false; });
  });
  $$("[data-preview-toggle]").forEach(b => b.onclick = () => { S.reviewer = !S.reviewer; save(); render(); });
  /* Preview only: wipe this account's progress and start over (on every device) */
  $$("[data-reset]").forEach(b => b.onclick = () => {
    if (!confirm("Erase all your answers and progress and start over? This clears it on every device you use.")) return;
    S = blank(); save(); go("home");
  });
  addEventListener("hashchange", render);
  render();
  if (session()) syncPull();
})();
