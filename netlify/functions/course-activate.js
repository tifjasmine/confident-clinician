const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const PARTICIPANTS_TABLE_ID = process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9";
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const formulaString = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const findApprovedParticipant = async (email) => {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${PARTICIPANTS_TABLE_ID}`);
  url.searchParams.set("maxRecords", "1");
  url.searchParams.set("filterByFormula", `AND(LOWER({Email})='${formulaString(email)}',OR({Enrollment Status}='Invited',{Enrollment Status}='Onboarding',{Enrollment Status}='Active'))`);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` } });
  if (!response.ok) throw new Error(`Airtable lookup failed (${response.status})`);
  return (await response.json()).records?.[0] || null;
};

const updateParticipant = async (recordId, fields) => {
  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PARTICIPANTS_TABLE_ID}/${recordId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!response.ok) throw new Error(`Airtable update failed (${response.status})`);
};

const ensureSupabaseUser = async ({ email, name }) => {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const temporaryPassword = `${crypto.randomUUID()}-${crypto.randomUUID().slice(0, 24)}`;
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { name: name || "", source: "confident_clinician_course" },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok) return result;
  const message = String(result.message || result.msg || "").toLowerCase();
  if (response.status === 422 && (message.includes("already") || message.includes("registered"))) return null;
  throw new Error(`Supabase user creation failed (${response.status})`);
};

const sendPasswordLink = async (email, origin) => {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const redirectTo = `${origin}/course/set-password.html`;
  const response = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(`Supabase password email failed (${response.status})`);
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed." });
  if (!process.env.AIRTABLE_ACCESS_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, message: "Course activation is not configured yet." });
  }
  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}
  const email = normalizeEmail(payload.email);
  if (!email || !email.includes("@")) return json(400, { ok: false, message: "Enter the email Tiffany used for your course enrollment." });

  try {
    const participant = await findApprovedParticipant(email);
    if (!participant) {
      return json(403, {
        ok: false,
        message: "That email is not on the course roster yet. Check the address you gave Tiffany or email admin@theconfidentclinician.me.",
      });
    }
    const user = await ensureSupabaseUser({ email, name: participant.fields?.Name || "" });
    const origin = process.env.URL || event.headers.origin || "https://theconfidentclinician.me";
    await sendPasswordLink(email, origin.replace(/\/$/, ""));
    await updateParticipant(participant.id, {
      "Supabase User ID": user?.id || participant.fields?.["Supabase User ID"] || "",
      "Enrollment Status": participant.fields?.["Enrollment Status"] === "Invited" ? "Onboarding" : participant.fields?.["Enrollment Status"] || "Onboarding",
      "Invite Sent At": new Date().toISOString(),
    });
    return json(200, {
      ok: true,
      message: "Check your email for a secure link to choose your password. The link may take a few minutes to arrive.",
    });
  } catch (error) {
    console.error("Course activation error", error);
    return json(500, { ok: false, message: "We could not send the password link right now. Please try again shortly." });
  }
};
