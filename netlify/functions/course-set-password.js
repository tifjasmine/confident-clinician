const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const PARTICIPANTS_TABLE_ID = process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9";
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});
const formulaString = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed." });
  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}
  const accessToken = String(payload.accessToken || "").trim();
  const password = String(payload.password || "");
  if (!accessToken || password.length < 8) return json(400, { ok: false, message: "Use a valid password link and at least eight characters." });

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.email) return json(400, { ok: false, message: "That link may have expired. Return to the course page and request a new one." });

  try {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${PARTICIPANTS_TABLE_ID}`);
    url.searchParams.set("maxRecords", "1");
    url.searchParams.set("filterByFormula", `LOWER({Email})='${formulaString(user.email.toLowerCase())}'`);
    const rosterResponse = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` } });
    const record = (await rosterResponse.json()).records?.[0];
    if (record) {
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PARTICIPANTS_TABLE_ID}/${record.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { "Supabase User ID": user.id, "Account Activated": true, "Enrollment Status": "Active", "Last Active": new Date().toISOString() }, typecast: true }),
      });
    }
  } catch (error) {
    console.error("Course activation status update failed", error);
  }
  return json(200, { ok: true, message: "Your password is ready." });
};
