/* Lab video page (VSL): visitor tracking + contact messages -> Airtable.
   Base: Confident Clinician – Lab Attempts (The Daily Session workspace).
     VSL Visitors  one row per visitor (matched on Visitor ID): visits, played, furthest % watched, clicks, source
     VSL Messages  one row per message from the contact box
   Token: AIRTABLE_LAB_TOKEN (same token the Lab uses). Nothing here is shown to visitors. */
const BASE_ID = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const VISITORS = process.env.AIRTABLE_VSL_VISITORS_TABLE_ID || "tblVuMYDfpm5KyIBi";
const MESSAGES = process.env.AIRTABLE_VSL_MESSAGES_TABLE_ID || "tbllorQRmoq1TAc27";

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const text = (v, n = 300) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const cleanEmail = v => { const e = text(v, 200).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; };
const strip = f => { Object.keys(f).forEach(k => (f[k] === undefined || f[k] === "") && delete f[k]); return f; };
const EVENTS = new Set(["view", "play", "progress", "join", "account", "message"]);
const DEVICES = new Set(["Phone", "Tablet", "Computer"]);

async function at(token, path, method = "GET", body) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 1100 * (i + 1))); continue; }
    if (!res.ok) { const e = new Error(`Airtable ${method} ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
    return res.json();
  }
  throw new Error("Airtable rate limited");
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const token = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
  if (!token) return json(503, { error: "Tracking not configured" });
  if ((event.body || "").length > 12000) return json(413, { error: "Too large" });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const visitor = text(b.visitor, 64);
  const ev = text(b.event, 20);
  if (!/^[\w-]{8,64}$/.test(visitor) || !EVENTS.has(ev)) return json(400, { error: "Bad event" });
  if (ev === "message" && text(b.website)) return json(200, { ok: true }); /* honeypot: quietly ignore bots */

  const now = new Date().toISOString();
  try {
    const f = encodeURIComponent(`{Visitor ID}='${visitor}'`);
    const found = (await at(token, `${VISITORS}?maxRecords=1&filterByFormula=${f}`)).records || [];
    const old = found[0] ? found[0].fields : {};
    const fields = { "Visitor ID": visitor, "Last seen": now };
    if (!found[0]) Object.assign(fields, strip({
      "First seen": now, Visits: 1,
      Source: text(b.source, 120), Medium: text(b.medium, 120), Campaign: text(b.campaign, 160),
      Referrer: text(b.referrer, 300), Device: DEVICES.has(b.device) ? b.device : undefined,
    }));
    if (ev === "view" && found[0]) fields.Visits = (old.Visits || 0) + 1;
    if (ev === "play") fields["Played video"] = true;
    if (ev === "progress") {
      const pct = Math.max(0, Math.min(1, Number(b.pct) || 0));
      fields["Played video"] = true;
      if (pct > (old.Watched || 0)) fields.Watched = pct;
    }
    if (ev === "join") fields["Clicked Join"] = true;
    if (ev === "account") fields["Clicked account"] = true;

    if (ev === "message") {
      const email = cleanEmail(b.email);
      const message = text(b.message, 4000);
      if (!email || message.length < 2) return json(400, { error: "Please add your email and a message." });
      await at(token, MESSAGES, "POST", { records: [{ fields: strip({ Name: text(b.name, 120), Email: email, Message: message, "Sent at": now, Status: "New", "Visitor ID": visitor }) }] });
      fields["Sent message"] = true;
      fields.Email = email;
    }

    if (found[0]) await at(token, VISITORS, "PATCH", { records: [{ id: found[0].id, fields }] });
    else await at(token, VISITORS, "POST", { records: [{ fields }] });
    return json(200, { ok: true });
  } catch (error) {
    console.error("VSL track failed", error.message, error.detail || "");
    return json(502, { error: ev === "message" ? "That didn’t send. Please try again, or email admin@theconfidentclinician.me." : "Not saved" });
  }
};
