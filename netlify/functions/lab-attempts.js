/* Clinical Confidence Lab: behind-the-scenes attempt log.
   Airtable base "Confident Clinician – Lab Attempts" (The Daily Session workspace), four linked tables:
     Students   one row per student (matched on Email)
     Activities the list of Lab activities (matched on Key; managed in Airtable)
     Attempts   one row per student per activity per try (matched on Attempt ID), links Student + Activity
     Answers    one row per question in an attempt (matched on Answer ID), links Attempt
   First answers are locked by the page; this function only writes what it is sent.
   Token: AIRTABLE_LAB_TOKEN, or AIRTABLE_ACCESS_TOKEN if that token has access to the base.
   Nothing here is shown to students. */
const BASE_ID = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const T = {
  students: process.env.AIRTABLE_LAB_STUDENTS_TABLE_ID || "tblCPF6nJf5FdYsjq",
  activities: process.env.AIRTABLE_LAB_ACTIVITIES_TABLE_ID || "tblzr9GMPbs82pCGO",
  attempts: process.env.AIRTABLE_LAB_ATTEMPTS_TABLE_ID || "tblbJ8NPny5fM6WaY",
  answers: process.env.AIRTABLE_LAB_ANSWERS_TABLE_ID || "tblt6WfYx5LTM4aNo",
  feedback: process.env.AIRTABLE_LAB_FEEDBACK_TABLE_ID || "tbliDu3irWehb4dCQ",
};
const MAX_TEXT = 20000;
let activityCache = null; /* Key -> record id, cached per warm function instance */

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const text = (v, max = MAX_TEXT) => String(v == null ? "" : v).slice(0, max);
const num = v => (Number.isFinite(+v) ? Math.max(0, Math.min(9999, Math.round(+v))) : undefined);
const iso = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); };
const cleanEmail = v => { const e = text(v, 200).trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; };
const idOk = v => /^[\w@.+\-·#| ]{6,240}$/.test(String(v || ""));
const strip = f => { Object.keys(f).forEach(k => (f[k] === undefined || f[k] === "") && delete f[k]); return f; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function at(token, path, method = "GET", body) {
  for (let tryN = 0; tryN < 3; tryN++) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429) { await sleep(1100 * (tryN + 1)); continue; }
    if (!res.ok) { const d = await res.text(); const e = new Error(`Airtable ${method} ${path.split("?")[0]} ${res.status}`); e.status = res.status; e.detail = d.slice(0, 400); throw e; }
    await sleep(210); /* stay under 5 requests/second per base */
    return res.json();
  }
  const e = new Error("Airtable rate limited"); e.status = 429; throw e;
}
const upsert = (token, table, merge, records) => at(token, table, "PATCH", { performUpsert: { fieldsToMergeOn: [merge] }, records: records.map(fields => ({ fields })), typecast: false });

async function activities(token) {
  if (activityCache) return activityCache;
  const map = {}; let offset = "";
  do {
    const r = await at(token, `${T.activities}?pageSize=100&fields%5B%5D=Key${offset ? `&offset=${offset}` : ""}`);
    (r.records || []).forEach(x => { if (x.fields && x.fields.Key) map[x.fields.Key] = x.id; });
    offset = r.offset || "";
  } while (offset);
  return (activityCache = map);
}

async function student(token, email, source, when) {
  const f = encodeURIComponent(`LOWER({Email})='${email.replace(/'/g, "\\'")}'`);
  const found = await at(token, `${T.students}?maxRecords=1&filterByFormula=${f}`);
  const fields = strip({ "Last active": when, Source: source });
  if (found.records && found.records[0]) { await at(token, T.students, "PATCH", { records: [{ id: found.records[0].id, fields }] }); return found.records[0].id; }
  const made = await at(token, T.students, "POST", { records: [{ fields: { Email: email, "First seen": when, ...fields } }] });
  return made.records[0].id;
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const token = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) return json(503, { error: "Attempt log not configured" });
  if ((event.body || "").length > 300000) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const email = cleanEmail(body.email);
  const source = body.source === "Live" ? "Live" : "Preview";
  const rows = (Array.isArray(body.attempts) ? body.attempts : []).slice(0, 10).filter(r => r && idOk(r.attemptId) && typeof r.activityKey === "string");
  if (!email || !rows.length) return json(400, { error: "Nothing valid to save" });
  try {
    const now = new Date().toISOString();
    const [acts, studentId] = [await activities(token), await student(token, email, source, now)];
    const attemptRecs = await upsert(token, T.attempts, "Attempt ID", rows.map(r => strip({
      "Attempt ID": text(r.attemptId, 240),
      Student: [studentId],
      Activity: acts[r.activityKey] ? [acts[r.activityKey]] : undefined,
      Detail: text(r.detail, 200),
      "Attempt #": num(r.attemptNo),
      Status: r.status === "Finished" ? "Finished" : "In progress",
      "Changed answers": num(r.changed),
      "First-try matches": text(r.matches, 100),
      Started: iso(r.started),
      "Last updated": iso(r.updated) || now,
      Source: source,
    })));
    const idByAttempt = {};
    (attemptRecs.records || []).forEach(x => { idByAttempt[x.fields["Attempt ID"]] = x.id; });
    const answers = [];
    rows.forEach(r => (Array.isArray(r.answers) ? r.answers : []).slice(0, 120).forEach(a => {
      const attemptRec = idByAttempt[text(r.attemptId, 240)];
      if (!attemptRec || !a || !a.key) return;
      answers.push(strip({
        "Answer ID": text(`${r.attemptId}|${a.key}`, 300),
        Attempt: [attemptRec],
        Order: num(a.order),
        Question: text(a.q, 300),
        "First answer": text(a.first),
        "Final answer": text(a.final),
        Expected: text(a.expected, 300),
        "Client line": text(a.clientLine, 2000),
        "Training note": text(a.note, 3000),
      }));
    }));
    for (let k = 0; k < answers.length; k += 10) await upsert(token, T.answers, "Answer ID", answers.slice(k, k + 10));
    const TYPES = { "Training note": 1, "Client reply": 1, "Session summary": 1 };
    const fb = [];
    rows.forEach(r => (Array.isArray(r.feedback) ? r.feedback : []).slice(0, 60).forEach(f => {
      const attemptRec = idByAttempt[text(r.attemptId, 240)];
      if (!attemptRec || !f || !f.id || !["up", "down"].includes(f.rating)) return;
      fb.push(strip({
        "Feedback ID": text(`${r.attemptId}|${f.id}`, 300),
        Rating: f.rating === "up" ? "👍 Helpful" : "👎 Not helpful or not accurate",
        "What was off": text(f.note, 2000),
        Where: text(f.where, 200),
        "Reply type": TYPES[f.type] ? f.type : undefined,
        "What the practice partner said": text(f.ai, 4000),
        "Student's words": text(f.input, 2000),
        Attempt: [attemptRec],
        Student: [studentId],
        "Rated at": iso(f.at),
      }));
    }));
    for (let k = 0; k < fb.length; k += 10) await upsert(token, T.feedback, "Feedback ID", fb.slice(k, k + 10));
    return json(200, { ok: true, attempts: rows.length, answers: answers.length, feedback: fb.length });
  } catch (error) {
    console.error("Lab attempts save failed", error.message, error.detail || "");
    return json(502, { error: "Could not save attempts", status: error.status || 0 });
  }
};
