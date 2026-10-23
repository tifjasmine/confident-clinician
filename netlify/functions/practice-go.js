const crypto = require("node:crypto");

const BASE_ID = process.env.AIRTABLE_PRACTICE_BASE_ID || "appxvDBMXbODnk9tS";
const FUNNEL_TABLE = process.env.AIRTABLE_PRACTICE_FUNNEL_TABLE_ID || "tbl7RLsUtFoAjKOmM";
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const redirect = (location) => ({ statusCode: 302, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }, body: "" });

const decodeReferral = (token) => {
  const secret = process.env.PRACTICE_REFERRAL_SECRET;
  const [payload, signature] = clean(token, 2000).split(".");
  if (!payload || !signature || !secret) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data.exp > Date.now() ? data : null; } catch { return null; }
};

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const path = clean(params.path, 100).replace(/[^a-z0-9-]/gi, "") || "boundaries-and-guilt";
  const referral = decodeReferral(params.ref);
  const finalParams = new URLSearchParams({ source: "manychat", campaign: clean(params.campaign, 150), keyword: clean(params.keyword, 100), trigger: clean(params.trigger, 100), ref: clean(params.ref, 2000) });
  const destination = `https://theconfidentclinician.me/clinical-breakdowns/${encodeURIComponent(path)}?${finalParams}`;
  if (!referral || !process.env.AIRTABLE_ACCESS_TOKEN) return redirect(destination);
  try {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${FUNNEL_TABLE}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { "Event ID": `event-${crypto.randomUUID()}`, "Event Type": "Access Requested", "Event At": new Date().toISOString(), "Instagram Handle": clean(referral.instagramUsername, 100).replace(/^@/, ""), "ManyChat Contact ID": clean(referral.manychatContactId, 150), Keyword: clean(params.keyword, 100), "Trigger Type": clean(params.trigger, 100), Campaign: clean(params.campaign, 150), "Exercise Reference": path, "Lead ID": clean(referral.leadId, 150) }, typecast: true }) });
    if (!response.ok) console.error("practice-go Airtable write failed", response.status);
  } catch (error) { console.error("practice-go", error); }
  return redirect(destination);
};
