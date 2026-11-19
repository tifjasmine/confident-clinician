/* Clinical Confidence Lab: behind-the-scenes attempt log.
   The Lab page sends one row per student per activity attempt; this upserts it into the
   "Lab Attempts" table (Airtable base "Confident Clinician – Lab Attempts", in The Daily Session workspace).
   Rows are matched on "Attempt ID", so the same row updates as the student works.
   Needs an Airtable token with write access to that base: AIRTABLE_LAB_TOKEN, or AIRTABLE_ACCESS_TOKEN
   if that token has been given access to the base. Nothing here is shown to students. */
const BASE_ID = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const TABLE_ID = process.env.AIRTABLE_LAB_ATTEMPTS_TABLE_ID || "tblz2nmSTaSFicGka";
const ACTIVITIES = new Set(["Day 1 Baseline", "Name the Gap", "Catch the Reaction", "Two Takes", "Demo: Your Sentence + Why", "The Clinical Blind Spot", "Jordan Simulation", "Reflect & Redo", "Clinical Confidence Profile", "Rep"]);
const MAX_TEXT = 20000;

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const text = (v, max = MAX_TEXT) => String(v == null ? "" : v).slice(0, max);
const num = v => (Number.isFinite(+v) ? Math.max(0, Math.min(9999, Math.round(+v))) : undefined);
const iso = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); };
const email = v => { const e = text(v, 200).trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; };

const toFields = r => {
  const f = {
    "Attempt ID": text(r.attemptId, 200),
    "Student email": email(r.email) || undefined,
    Activity: ACTIVITIES.has(r.activity) ? r.activity : undefined,
    Detail: text(r.detail, 200) || undefined,
    Week: num(r.week),
    "Attempt #": num(r.attemptNo),
    Status: r.status === "Finished" ? "Finished" : "In progress",
    "First answers": text(r.first),
    "Final answers": text(r.final),
    "Changed answers": num(r.changed),
    "First-try matches": text(r.matches, 100) || undefined,
    Started: iso(r.started),
    "Last updated": iso(r.updated) || new Date().toISOString(),
    Source: r.source === "Live" ? "Live" : "Preview",
    "Raw data": text(r.raw),
  };
  Object.keys(f).forEach(k => f[k] === undefined && delete f[k]);
  return f;
};

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const token = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) return json(503, { error: "Attempt log not configured" });
  if ((event.body || "").length > 200000) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const rows = (Array.isArray(body.records) ? body.records : []).slice(0, 10)
    .filter(r => r && /^[\w@.+\-·#| ]{6,200}$/.test(String(r.attemptId || "")) && ACTIVITIES.has(r.activity))
    .map(r => ({ fields: toFields(r) }));
  if (!rows.length) return json(400, { error: "No valid records" });
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ["Attempt ID"] }, records: rows, typecast: false }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Lab attempts upsert failed", res.status, detail.slice(0, 500));
      return json(502, { error: "Could not save attempts", status: res.status });
    }
    return json(200, { ok: true, saved: rows.length });
  } catch (error) {
    console.error("Lab attempts upsert error", error);
    return json(502, { error: "Could not save attempts" });
  }
};
