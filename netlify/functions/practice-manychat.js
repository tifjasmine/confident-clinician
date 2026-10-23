const crypto = require("node:crypto");

const BASE_ID = process.env.AIRTABLE_PRACTICE_BASE_ID || "appxvDBMXbODnk9tS";
const LEADS_TABLE = process.env.AIRTABLE_PRACTICE_LEADS_TABLE_ID || "tblEvRzM42xU89aAe";
const FUNNEL_TABLE = process.env.AIRTABLE_PRACTICE_FUNNEL_TABLE_ID || "tbl7RLsUtFoAjKOmM";
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const reply = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const headers = () => ({ Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" });
const url = (id = "") => `https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}${id ? `/${id}` : ""}`;
const funnelUrl = () => `https://api.airtable.com/v0/${BASE_ID}/${FUNNEL_TABLE}`;
const formulaValue = (value) => clean(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findByContact(contactId) {
  const request = new URL(url()); request.searchParams.set("pageSize", "1"); request.searchParams.set("filterByFormula", `{ManyChat Contact ID}='${formulaValue(contactId)}'`);
  const response = await fetch(request, { headers: headers() }); if (!response.ok) throw new Error("Airtable lookup failed"); return (await response.json()).records?.[0];
}
async function write(fields, id = "") {
  const response = await fetch(url(id), { method: id ? "PATCH" : "POST", headers: headers(), body: JSON.stringify({ fields, typecast: true }) });
  if (!response.ok) throw new Error("Airtable write failed"); return response.json();
}
async function writeFunnel(fields) {
  const response = await fetch(funnelUrl(), { method: "POST", headers: headers(), body: JSON.stringify({ fields, typecast: true }) });
  if (!response.ok) throw new Error("Airtable funnel write failed");
  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { message: "Method not allowed." });
  const supplied = clean(event.headers["x-practice-integration-secret"] || event.headers["X-Practice-Integration-Secret"], 500);
  const integrationSecret = process.env.PRACTICE_INTEGRATION_SECRET;
  const referralSecret = process.env.PRACTICE_REFERRAL_SECRET;
  if (!integrationSecret || !referralSecret || supplied.length !== integrationSecret.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(integrationSecret))) return reply(403, { message: "Integration authentication failed." });
  try {
    const body = JSON.parse(event.body || "{}");
    const contact = body.contact && typeof body.contact === "object" ? body.contact : body;
    const contactId = clean(body.manychatContactId || contact.id || contact.subscriber_id || contact.contact_id, 150);
    if (!contactId) return reply(400, { message: "manychatContactId is required." });
    const now = new Date().toISOString();
    const found = await findByContact(contactId);
    const leadId = found?.fields?.["Lead ID"] || `lead-${crypto.randomUUID()}`;
    const firstName = body.firstName || contact.first_name || contact.firstName || "";
    const instagramUsername = body.instagramUsername || contact.username || contact.instagram_username || contact.ig_username || "";
    const sourceCampaign = body.sourceCampaign || contact.source_campaign || "practice-keyword";
    const exerciseReference = body.exerciseReference || contact.exercise_reference || "boundaries-and-guilt";
    await write({ "Lead ID": leadId, "First Name": clean(firstName, 80), "Instagram Handle": clean(instagramUsername, 100).replace(/^@/, ""), "ManyChat Contact ID": contactId, "Identity Verified": true, Source: clean(body.source || "manychat", 100), "Source Campaign": clean(sourceCampaign, 150), "Exercise Reference": clean(exerciseReference, 100), "First Activity At": found?.fields?.["First Activity At"] || now, "Last Activity At": now }, found?.id || "");
    const payload = Buffer.from(JSON.stringify({ leadId, manychatContactId: contactId, instagramUsername: clean(instagramUsername, 100).replace(/^@/, ""), exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
    const signature = crypto.createHmac("sha256", referralSecret).update(payload).digest("base64url");
    const path = clean(exerciseReference, 100) || "boundaries-and-guilt";
    await writeFunnel({ "Event ID": `event-${crypto.randomUUID()}`, "Event Type": clean(body.eventType || "Keyword Triggered", 60), "Event At": now, "Instagram Handle": clean(instagramUsername, 100).replace(/^@/, ""), "ManyChat Contact ID": contactId, Keyword: clean(body.keyword || "PRACTICE", 100), "Trigger Type": clean(body.triggerType || "instagram-keyword", 100), Campaign: clean(sourceCampaign, 150), "Exercise Reference": clean(exerciseReference, 100), "Lead ID": leadId });
    const referralToken = `${payload}.${signature}`;
    const clickParams = new URLSearchParams({ path, campaign: clean(sourceCampaign, 150), keyword: clean(body.keyword || "PRACTICE", 100), trigger: clean(body.triggerType || "instagram-keyword", 100), ref: referralToken });
    return reply(200, { ok: true, leadId, referralToken, exerciseUrl: `https://theconfidentclinician.me/.netlify/functions/practice-go?${clickParams}`, expiresIn: "24 hours" });
  } catch (error) { console.error("practice-manychat", error); return reply(500, { message: "The ManyChat practice integration could not complete the request." }); }
};
