/* Clinical Confidence Lab: progress saved to the student's account, so it follows them to any device.
   Airtable "Saved Progress" table in the Lab base: one row per student (matched on Email).
   The progress is stored compressed (gzip + base64) in the Progress box; "Saved at (ms)" is the page's own
   timestamp, so an older copy (another tab, another device) never overwrites a newer one.
   POST { action: "load" }                     -> { ok, state|null, t }
   POST { action: "save", state, t }           -> { ok, t } or { ok:false, stale:true, state, t } when the account has a newer copy
   The email always comes from the signed sign-in token, never from the browser. */
const zlib = require("zlib");
const { verify } = require("../lib/lab-auth");

const BASE_ID = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const TABLE = process.env.AIRTABLE_LAB_PROGRESS_TABLE_ID || "tblsswBfwOFVmlU1M";
const MAX_RAW = 3000000; /* 3 MB of progress JSON */
const MAX_CELL = 99000;  /* Airtable long text holds 100,000 characters */

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const fstr = v => String(v || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function at(token, path, method = "GET", body) {
  for (let tryN = 0; tryN < 3; tryN++) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429) { await sleep(1100 * (tryN + 1)); continue; }
    if (!res.ok) { const d = await res.text(); const e = new Error(`Airtable ${method} ${res.status}`); e.status = res.status; e.detail = d.slice(0, 300); throw e; }
    return res.json();
  }
  const e = new Error("Airtable rate limited"); e.status = 429; throw e;
}

const pack = obj => "gz:" + zlib.gzipSync(Buffer.from(JSON.stringify(obj))).toString("base64");
const unpack = s => {
  if (!s) return null;
  try { return JSON.parse(s.startsWith("gz:") ? zlib.gunzipSync(Buffer.from(s.slice(3), "base64")).toString() : s); } catch { return null; }
};

async function find(token, email) {
  const f = encodeURIComponent(`LOWER({Email})='${fstr(email)}'`);
  const r = await at(token, `${TABLE}?maxRecords=1&filterByFormula=${f}`);
  return (r.records || [])[0] || null;
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const token = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) return json(503, { error: "Progress saving isn't set up" });
  const user = verify(event);
  if (!user) return json(401, { error: "Please sign in again.", auth: true });
  const raw = event.body || "";
  if (raw.length > MAX_RAW) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const email = user.email;
  try {
    const row = await find(token, email);
    const savedT = row ? +(row.fields["Saved at (ms)"] || 0) : 0;
    if (body.action === "load") {
      return json(200, { ok: true, state: row ? unpack(row.fields.Progress) : null, t: savedT });
    }
    if (body.action !== "save" || !body.state || typeof body.state !== "object") return json(400, { error: "Nothing to save" });
    const t = Math.round(+body.t || 0);
    if (!t) return json(400, { error: "Missing time" });
    if (row && savedT > t) return json(200, { ok: false, stale: true, state: unpack(row.fields.Progress), t: savedT });
    let state = body.state, cell = pack(state);
    if (cell.length > MAX_CELL && state.ai) { state = { ...state, ai: {} }; cell = pack(state); } /* drop cached practice-partner replies first */
    if (cell.length > MAX_CELL) { console.error("Progress too large", email, cell.length); return json(413, { error: "Progress too large to save" }); }
    const fields = { Email: email, Progress: cell, "Saved at (ms)": t, "Last saved": new Date().toISOString(), "Size (KB)": Math.round(cell.length / 102.4) / 10 };
    if (row) await at(token, TABLE, "PATCH", { records: [{ id: row.id, fields }] });
    else await at(token, TABLE, "POST", { records: [{ fields }] });
    return json(200, { ok: true, t });
  } catch (error) {
    console.error("Lab progress failed", error.message, error.detail || "");
    return json(502, { error: "Could not reach saved progress" });
  }
};
