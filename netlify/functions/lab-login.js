/* Clinical Confidence Lab sign-in.
   1. Checks the email + password with Supabase (same accounts as the course).
   2. Checks the email is on the Lab roster (Airtable course participants) with a status that has access.
   Returns the student's email and first name. No passwords are stored or logged here. */
const { issue } = require("../lib/lab-auth");
const PREVIEW_EMAIL = "studentpreview@theconfidentclinician.me";
const PREVIEW_PASSWORD = process.env.LAB_PREVIEW_PASSWORD || "LabPreview2026!";
const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const PARTICIPANTS_TABLE_ID = process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9";
const ACCESS = ["Purchased", "Invited", "Onboarding", "Active"];

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const formulaString = v => String(v || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed." });
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  let p = {};
  try { p = JSON.parse(event.body || "{}"); } catch {}
  const email = String(p.email || "").trim().toLowerCase();
  const password = String(p.password || "");
  if (!email || !password) return json(400, { ok: false, message: "Enter your email and password." });
  /* Shared preview/test account: unlimited, checked here on the server now (not in the browser). */
  if (email === PREVIEW_EMAIL) {
    if (password !== PREVIEW_PASSWORD) return json(401, { ok: false, message: "That email and password don’t match." });
    try { return json(200, { ok: true, email, first: "", test: true, token: issue(email, true) }); } catch (e) { console.error("Lab sign-in key missing", e.message); return json(500, { ok: false, message: "Sign-in isn’t set up yet." }); }
  }
  if (!supabaseUrl || !anonKey || !process.env.AIRTABLE_ACCESS_TOKEN) return json(500, { ok: false, message: "Sign-in isn’t set up yet. Please email admin@theconfidentclinician.me." });


  try {
    const auth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const a = await auth.json().catch(() => ({}));
    if (!auth.ok || !a.access_token) return json(401, { ok: false, message: "That email and password don’t match. New here? Use “Set up my account.”" });

    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${PARTICIPANTS_TABLE_ID}`);
    url.searchParams.set("maxRecords", "1");
    url.searchParams.set("filterByFormula", `AND(LOWER({Email})='${formulaString(email)}',OR(${ACCESS.map(s => `{Enrollment Status}='${s}'`).join(",")}))`);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` } });
    if (!r.ok) throw new Error(`Roster lookup failed (${r.status})`);
    const rec = ((await r.json()).records || [])[0];
    if (!rec) return json(403, { ok: false, message: "Your account works, but it isn’t enrolled in the Lab yet. Email admin@theconfidentclinician.me and we’ll sort it out." });

    const name = String(rec.fields?.Name || "").trim();
    return json(200, { ok: true, email, first: name && !name.includes("@") ? name.split(/\s+/)[0] : "", test: false, token: issue(email, false) });
  } catch (error) {
    console.error("Lab sign-in error", error.message);
    return json(500, { ok: false, message: "Sign-in is temporarily unavailable. Please try again." });
  }
};
