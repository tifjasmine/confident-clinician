const crypto = require("node:crypto");
const BASE_ID = process.env.AIRTABLE_PRACTICE_BASE_ID || "appxvDBMXbODnk9tS";
const FUNNEL_TABLE = process.env.AIRTABLE_PRACTICE_FUNNEL_TABLE_ID || "tbl7RLsUtFoAjKOmM";
const ALLOWED_EMAILS = (process.env.PRACTICE_ADMIN_EMAILS || "tiffany@livingwright.org,admin@theconfidentclinician.me").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
const COOKIE = "tcc_practice_funnel_admin";
const json = (statusCode, body, extraHeaders = {}) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store, private", ...extraHeaders }, body: JSON.stringify(body) });
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const safeEqual = (a, b) => { const left = Buffer.from(String(a)); const right = Buffer.from(String(b)); return left.length === right.length && crypto.timingSafeEqual(left, right); };
const verifyPassword = (password) => {
  const [salt, expected] = String(process.env.PRACTICE_ADMIN_PASSWORD_HASH || "").split(":");
  if (!salt || !expected) return false;
  return safeEqual(crypto.scryptSync(String(password || ""), salt, 64).toString("hex"), expected);
};
const airtableHeaders = () => ({ Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` });
const sign = (payload) => crypto.createHmac("sha256", process.env.PRACTICE_ADMIN_SESSION_SECRET).update(payload).digest("base64url");
const sessionToken = (email) => { const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url"); return `${payload}.${sign(payload)}`; };
const cookieValue = (event) => (event.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || "";
const readSession = (event) => {
  const [payload, signature] = cookieValue(event).split(".");
  if (!payload || !signature || !process.env.PRACTICE_ADMIN_SESSION_SECRET || !safeEqual(signature, sign(payload))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data.exp > Date.now() && ALLOWED_EMAILS.includes(data.email) ? data : null; } catch { return null; }
};
async function listEvents() {
  const records = []; let offset = "";
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${FUNNEL_TABLE}`);
    url.searchParams.set("pageSize", "100"); url.searchParams.set("sort[0][field]", "Event At"); url.searchParams.set("sort[0][direction]", "desc"); if (offset) url.searchParams.set("offset", offset);
    const response = await fetch(url, { headers: airtableHeaders() }); if (!response.ok) throw new Error(`Airtable read failed (${response.status})`);
    const data = await response.json(); records.push(...(data.records || [])); offset = data.offset || "";
  } while (offset && records.length < 1000);
  return records.map((record) => ({ id: record.id, ...record.fields }));
}
exports.handler = async (event) => {
  const action = event.queryStringParameters?.action || "session";
  if (event.httpMethod === "POST" && action === "login") {
    if (!process.env.PRACTICE_ADMIN_PASSWORD_HASH || !process.env.PRACTICE_ADMIN_SESSION_SECRET) return json(503, { message: "Admin access is not configured yet." });
    let body = {}; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { message: "Invalid request." }); }
    const email = clean(body.email, 254).toLowerCase();
    if (!ALLOWED_EMAILS.includes(email) || !verifyPassword(body.password)) return json(401, { message: "That email or password is not recognized." });
    return json(200, { ok: true, email }, { "Set-Cookie": `${COOKIE}=${sessionToken(email)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
  }
  if (event.httpMethod === "POST" && action === "logout") return json(200, { ok: true }, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  const session = readSession(event); if (!session) return json(401, { authenticated: false });
  if (event.httpMethod === "GET" && action === "session") return json(200, { authenticated: true, email: session.email });
  if (event.httpMethod === "GET" && action === "events") {
    if (!process.env.AIRTABLE_ACCESS_TOKEN) return json(503, { message: "Airtable is not configured." });
    try { const events = await listEvents(); const counts = events.reduce((totals, item) => { const type = item["Event Type"] || "Other"; totals[type] = (totals[type] || 0) + 1; return totals; }, {}); const people = new Set(events.map((item) => item["ManyChat Contact ID"] || item["Lead ID"] || item["Anonymous Session ID"]).filter(Boolean)).size; return json(200, { email: session.email, events, counts, people }); }
    catch (error) { console.error("practice-funnel-admin", error); return json(500, { message: "The funnel data could not be loaded." }); }
  }
  return json(405, { message: "Method not allowed." });
};
