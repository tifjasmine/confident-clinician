/* Clinical Confidence Lab: signed sign-in tokens + server-side usage limits.
   Token = base64url(JSON {e: email, t: test?, x: expires}) + "." + HMAC-SHA256 signature.
   Signing key: LAB_SESSION_SECRET if set, otherwise the Supabase service key (server-only, never sent to browsers).
   Usage limits are counted in Airtable ("Practice Usage" table in the Lab base), so they can't be skipped in the browser. */
const crypto = require("crypto");

const key = () => process.env.LAB_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const b64 = s => Buffer.from(s).toString("base64url");
const sign = body => crypto.createHmac("sha256", key()).update(body).digest("base64url");

function issue(email, test, days = 14) {
  if (!key()) throw new Error("No signing key configured");
  const body = b64(JSON.stringify({ e: email, t: !!test, x: Date.now() + days * 864e5 }));
  return `${body}.${sign(body)}`;
}

/* Returns { email, test } or null */
function verify(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const tok = h.replace(/^Bearer\s+/i, "").trim();
  const [body, sig] = tok.split(".");
  if (!body || !sig || !key()) return null;
  const want = sign(body);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!p.e || !p.x || Date.now() > p.x) return null;
    return { email: String(p.e).toLowerCase(), test: !!p.t };
  } catch { return null; }
}

/* ---- Usage (Airtable) ---- */
const BASE_ID = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const USAGE = process.env.AIRTABLE_LAB_USAGE_TABLE_ID || "tblFcbUkGPSJ5rRGg";
const tokenAT = () => process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
const fstr = v => String(v || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function at(path, method = "GET", body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${tokenAT()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`Usage ${method} ${res.status}`);
  return res.json();
}

/* Live sessions: at most `perDay` different sessions in a rolling 24 hours, and at most `perSession` calls in one session.
   Returns { ok } or { ok:false, message }. Never blocks if the usage table isn't set up (logs instead). */
async function useLive(user, sessionId, perDay = 3, perSession = 120) {
  if (user.test) return { ok: true };
  if (!USAGE || !tokenAT()) { console.warn("Practice Usage table not configured; live limits not enforced"); return { ok: true }; }
  const sid = String(sessionId || "").replace(/[^\w-]/g, "").slice(0, 40);
  if (!sid) return { ok: false, message: "Please refresh the page and start the session again." };
  const f = encodeURIComponent(`AND(LOWER({Email})='${fstr(user.email)}',{Kind}='Live session',IS_AFTER({Started},DATEADD(NOW(),-24,'hours')))`);
  const rows = (await at(`${USAGE}?pageSize=50&filterByFormula=${f}`)).records || [];
  const mine = rows.find(r => r.fields["Session ID"] === `${user.email}|${sid}`);
  if (mine) {
    const calls = (mine.fields.Calls || 0) + 1;
    if (calls > perSession) return { ok: false, message: "This session has reached its limit. Start a new one when you have one available." };
    await at(USAGE, "PATCH", { records: [{ id: mine.id, fields: { Calls: calls } }] });
    return { ok: true };
  }
  if (rows.length >= perDay) return { ok: false, message: `You’ve used your ${perDay} live sessions for today. Your next one opens within 24 hours.` };
  await at(USAGE, "POST", { records: [{ fields: { "Session ID": `${user.email}|${sid}`, Email: user.email, Kind: "Live session", Started: new Date().toISOString(), Calls: 1 } }] });
  return { ok: true };
}

/* Short activity assists: at most `perDay` per day (Eastern date). */
async function useAssist(user, perDay = 80) {
  if (user.test) return { ok: true };
  if (!USAGE || !tokenAT()) { console.warn("Practice Usage table not configured; assist limits not enforced"); return { ok: true }; }
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const id = `${user.email}|assist|${day}`;
  const f = encodeURIComponent(`{Session ID}='${fstr(id)}'`);
  const row = ((await at(`${USAGE}?maxRecords=1&filterByFormula=${f}`)).records || [])[0];
  const calls = ((row && row.fields.Calls) || 0) + 1;
  if (calls > perDay) return { ok: false, message: "You’ve reached today’s practice feedback limit. It resets tomorrow." };
  if (row) await at(USAGE, "PATCH", { records: [{ id: row.id, fields: { Calls: calls } }] });
  else await at(USAGE, "POST", { records: [{ fields: { "Session ID": id, Email: user.email, Kind: "Assist", Started: new Date().toISOString(), Calls: 1 } }] });
  return { ok: true };
}

module.exports = { issue, verify, useLive, useAssist };
