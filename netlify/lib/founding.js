/* Clinical Confidence Lab: founding spots (Week 1 for $37, 10 spots, Week 1 opens Dec 1) and the Jan 1 waitlist.
   Lab base "Founding Spots" table: a row per checkout started; Status -> Paid when Stripe confirms payment.
   Paid spots are also added to the course roster (Airtable course participants) so they can sign in from Dec 1.
   Shared by lab-founding.js (page + return from checkout) and stripe-purchase-webhook.js (Stripe's own notice). */
const LAB_BASE = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const SPOTS = process.env.AIRTABLE_FOUNDING_TABLE_ID || "tblN3ZbXmuqUosV21";
const WAITLIST = process.env.AIRTABLE_WAITLIST_TABLE_ID || "tblEGSECBRhBBtB8Z";
const COURSE_BASE = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const PARTICIPANTS = process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9";
const PRICE_ID = process.env.LAB_FOUNDING_PRICE_ID || "price_1UfjA3ASlf43jszVfdzukGYa"; /* $37 */
const PRODUCT = "lab-founding-week1";
const TOTAL = 10;
const HOLD_MIN = 35; /* a started checkout holds a spot this long (Stripe checkout expires after 30 minutes) */
const COHORT = "Founding Spots · Week 1 opens Dec 1, 2026";
const OPENS_AT = Date.parse("2026-12-01T05:00:00Z"); /* Dec 1, 12:00 am Eastern */
const TEST_EMAILS = ["studentpreview@theconfidentclinician.me"];

const labToken = () => process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
const fstr = v => String(v || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = (v, n = 200) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const cleanEmail = v => { const e = text(v, 200).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; };
const isTest = email => TEST_EMAILS.includes(email) || /\+test@/.test(email);

async function at(base, path, method = "GET", body, token = labToken()) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://api.airtable.com/v0/${base}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429) { await sleep(1100 * (i + 1)); continue; }
    if (!res.ok) { const e = new Error(`Airtable ${method} ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
    return res.json();
  }
  throw new Error("Airtable rate limited");
}

/* Spots taken = Paid, plus checkouts started in the last HOLD_MIN minutes. Test rows never count. */
async function spotsLeft() {
  const f = encodeURIComponent(`AND(NOT({Test}),OR({Status}='Paid',AND({Status}='Started checkout',IS_AFTER({Signed up},DATEADD(NOW(),-${HOLD_MIN},'minutes')))))`);
  const r = await at(LAB_BASE, `${SPOTS}?pageSize=100&fields%5B%5D=Status&filterByFormula=${f}`);
  return Math.max(0, TOTAL - (r.records || []).length);
}

async function startRow({ email, first, source }) {
  const r = await at(LAB_BASE, SPOTS, "POST", { records: [{ fields: { Email: email, "First name": first, Status: "Started checkout", "Signed up": new Date().toISOString(), "Came from": source, Test: isTest(email) } }], typecast: true });
  return r.records[0].id;
}
const setCheckoutId = (id, sessionId) => at(LAB_BASE, SPOTS, "PATCH", { records: [{ id, fields: { "Stripe checkout ID": sessionId } }] });

async function stripe(path, method = "GET", params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params ? new URLSearchParams(params) : undefined });
  const j = await res.json();
  if (!res.ok) { const e = new Error(`Stripe ${res.status}: ${j?.error?.message || ""}`); throw e; }
  return j;
}

async function checkout({ origin, email, first, rowId }) {
  return stripe("checkout/sessions", "POST", {
    mode: "payment",
    "line_items[0][price]": PRICE_ID,
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: rowId,
    "metadata[product]": PRODUCT,
    "metadata[spot_row]": rowId,
    "metadata[first_name]": first,
    "payment_intent_data[metadata][product]": PRODUCT,
    allow_promotion_codes: "false",
    expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
    success_url: `${origin}/lab-video?founding=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/lab-video#join`,
  });
}

const sessionIsFounding = s => s && (s.metadata?.product === PRODUCT);

/* Mark a paid founding checkout: Founding Spots row -> Paid, and add them to the course roster. Safe to run twice. */
async function markPaid(session) {
  if (!sessionIsFounding(session) || session.payment_status !== "paid") return { ok: false };
  const email = cleanEmail(session.customer_details?.email || session.customer_email);
  const first = text(session.metadata?.first_name, 80) || text((session.customer_details?.name || "").split(/\s+/)[0], 80);
  const fields = { Email: email, "First name": first, Status: "Paid", "Paid at": new Date((session.created || Date.now() / 1000) * 1000).toISOString(), Amount: (session.amount_total || 3700) / 100, "Stripe checkout ID": session.id, Test: isTest(email) };
  let rowId = text(session.metadata?.spot_row || session.client_reference_id, 40);
  if (rowId) {
    try { const cur = await at(LAB_BASE, `${SPOTS}/${rowId}`); if (cur.fields?.Status === "Paid") { delete fields["Paid at"]; } }
    catch { rowId = ""; }
  }
  if (rowId) await at(LAB_BASE, SPOTS, "PATCH", { records: [{ id: rowId, fields }], typecast: true });
  else await at(LAB_BASE, SPOTS, "PATCH", { performUpsert: { fieldsToMergeOn: ["Stripe checkout ID"] }, records: [{ fields }], typecast: true });
  if (email && !isTest(email)) await addToRoster({ email, name: session.customer_details?.name || first || email });
  return { ok: true, first };
}

async function addToRoster({ email, name }) {
  const token = process.env.AIRTABLE_ACCESS_TOKEN || labToken();
  const f = encodeURIComponent(`LOWER({Email})='${fstr(email)}'`);
  const found = (await at(COURSE_BASE, `${PARTICIPANTS}?maxRecords=1&filterByFormula=${f}`, "GET", null, token)).records?.[0];
  const fields = { Name: name, Email: email, Program: "Clinical Confidence Lab", "Program Version": "CCL-2027-v1", Cohort: COHORT, "Payment Status": "Paid", "Current Week": 1 };
  if (!found?.fields?.["Enrollment Status"]) fields["Enrollment Status"] = "Purchased";
  if (!found) Object.assign(fields, { "Onboarding Status": "Onboarding incomplete", "Coaching Call Status": "Not booked" });
  if (found) {
    if (found.fields?.Cohort && found.fields.Cohort !== COHORT) delete fields.Cohort; /* already enrolled some other way: leave them alone */
    await at(COURSE_BASE, PARTICIPANTS, "PATCH", { records: [{ id: found.id, fields }], typecast: true }, token);
  } else await at(COURSE_BASE, PARTICIPANTS, "POST", { records: [{ fields }], typecast: true }, token);
}

async function joinWaitlist({ email, first, source }) {
  return at(LAB_BASE, WAITLIST, "PATCH", { performUpsert: { fieldsToMergeOn: ["Email"] }, records: [{ fields: { Email: email, "First name": first, Joined: new Date().toISOString(), "Came from": source, Test: isTest(email) } }], typecast: true });
}

/* For sign-in: founding students can't get in before Week 1 opens. */
const foundingNotOpenYet = cohort => String(cohort || "") === COHORT && Date.now() < OPENS_AT;

module.exports = { PRICE_ID, PRODUCT, TOTAL, COHORT, OPENS_AT, text, cleanEmail, isTest, spotsLeft, startRow, setCheckoutId, checkout, stripe, markPaid, joinWaitlist, sessionIsFounding, foundingNotOpenYet };
