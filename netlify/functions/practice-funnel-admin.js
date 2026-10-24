const crypto = require("node:crypto");
const { generateCampaign } = require("./practice-campaign-generator");
const BASE_ID = process.env.AIRTABLE_PRACTICE_BASE_ID || "appxvDBMXbODnk9tS";
const FUNNEL_TABLE = process.env.AIRTABLE_PRACTICE_FUNNEL_TABLE_ID || "tbl7RLsUtFoAjKOmM";
const TABLES = { exercises: "tblPFguDAbHiU2pkl", attempts: "tblNwje2Qovijm7Yt", responses: "tblTbXB4yZbKIFq7y", leads: "tblEvRzM42xU89aAe", history: "tblCiSAdgO6QS3ECU" };
const ALLOWED_EMAILS = (process.env.PRACTICE_ADMIN_EMAILS || "tiffany@livingwright.org,admin@theconfidentclinician.me").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
const COOKIE = "tcc_practice_funnel_admin";
const json = (statusCode, body, extraHeaders = {}) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store, private", ...extraHeaders }, body: JSON.stringify(body) });
const clean = (value, max = 10000) => String(value || "").trim().slice(0, max);
const safeEqual = (a, b) => { const left = Buffer.from(String(a)); const right = Buffer.from(String(b)); return left.length === right.length && crypto.timingSafeEqual(left, right); };
const verifyPassword = (password) => {
  const [salt, expected] = String(process.env.PRACTICE_ADMIN_PASSWORD_HASH || "").split(":");
  if (!salt || !expected) return false;
  return safeEqual(crypto.scryptSync(String(password || ""), salt, 64).toString("hex"), expected);
};
const airtableHeaders = () => ({ Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` });
const airtableUrl = (table, id = "") => `https://api.airtable.com/v0/${BASE_ID}/${table}${id ? `/${id}` : ""}`;
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
async function list(table, max = 100) {
  const url = new URL(airtableUrl(table)); url.searchParams.set("pageSize", String(Math.min(max, 100)));
  const response = await fetch(url, { headers: airtableHeaders() }); if (!response.ok) throw new Error(`Airtable read failed (${response.status})`);
  return (await response.json()).records || [];
}
async function write(table, fields, id = "") {
  const response = await fetch(airtableUrl(table, id), { method: id ? "PATCH" : "POST", headers: { ...airtableHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ fields, typecast: true }) });
  if (!response.ok) throw new Error(`Airtable write failed (${response.status})`); return response.json();
}
const parse = (value, fallback = []) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const mapExercise = (record) => { const f = record.fields || {}; return { id: record.id, exerciseId: f["Exercise ID"], type: f["Exercise Type"] === "What's Missing?" ? "The Clinical Response Check" : f["Exercise Type"], status: f.Status, number: f["Breakdown Number"], title: f.Title, slug: f.Slug, category: f.Category, summary: f.Summary, clientStatement: f["Client Statement"], therapistResponse: f["Therapist Response"], caseScenario: f["Case Scenario"], reflectionQuestion: f["Reflection Question"], hint: f.Hint, clinicalConsideration: f["Clinical Consideration"], clinicalConsiderationExplanation: f["Clinical Consideration Explanation"], therapistIntention: f["Therapist Intention"], clinicalPoints: parse(f["Clinical Points JSON"]), choices: parse(f["Choices JSON"]), alternatives: parse(f["Alternatives JSON"]), preferredStartingPoint: f["Preferred Starting Point"], biggerLesson: f["Bigger Clinical Lesson"], nuance: f["Context and Nuance"], practicalApplication: f["Practical Application"], reflectionPrompts: parse(f["Reflection Prompts JSON"]), seoDescription: f["SEO Description"], publicationDate: f["Publication Date"], roundTwoEnabled: Boolean(f["Round Two Enabled"]), roundTwoClientResponse: f["Round Two Client Response"] || "", roundTwoQuestion: f["Round Two Question"] || "", roundTwoAnswerFormat: f["Round Two Answer Format"] || "Free text", roundTwoChoices: parse(f["Round Two Choices JSON"]), roundTwoBreakdown: f["Round Two Breakdown"] || "", whatChangedBetweenDecisions: f["What Changed Between Decisions"] || "", saveFreeTextResponses: Boolean(f["Save Free-Text Responses"]), campaignKeyword: f["Campaign Keyword"] || "", campaignName: f["Campaign Name"] || "", instagramHook: f["Instagram Hook"] || "", instagramCaption: f["Instagram Caption"] || "", carouselSlides: parse(f["Carousel Slides JSON"]), publicReplies: parse(f["Public Replies JSON"]), openingDm: f["Opening DM"] || "", manychatButtonLabel: f["ManyChat Button Label"] || "", linkDeliveryMessage: f["Link Delivery Message"] || "", followUpMessage: f["Follow Up Message"] || "", marblismBrief: f["Marblism Brief"] || "", campaignStatus: f["Campaign Status"] || "" }; };

const exerciseFields = (body, { exerciseId, slug, status, now }) => ({
  "Exercise ID": exerciseId, "Exercise Type": body.type === "Clinical Case Lab" ? "Clinical Case Lab" : "The Clinical Response Check", Status: status, "Breakdown Number": clean(body.number, 10), Title: clean(body.title, 200), Slug: slug, Category: clean(body.category, 100), Summary: clean(body.summary, 1000), "Client Statement": clean(body.clientStatement), "Therapist Response": clean(body.therapistResponse), "Case Scenario": clean(body.caseScenario), "Reflection Question": clean(body.reflectionQuestion), Hint: clean(body.hint), "Clinical Consideration": clean(body.clinicalConsideration, 300), "Clinical Consideration Explanation": clean(body.clinicalConsiderationExplanation), "Therapist Intention": clean(body.therapistIntention), "Clinical Points JSON": JSON.stringify(body.clinicalPoints || []), "Choices JSON": JSON.stringify(body.choices || []), "Alternatives JSON": JSON.stringify(body.alternatives || []), "Preferred Starting Point": clean(body.preferredStartingPoint), "Bigger Clinical Lesson": clean(body.biggerLesson), "Context and Nuance": clean(body.nuance), "Practical Application": clean(body.practicalApplication), "Reflection Prompts JSON": JSON.stringify(body.reflectionPrompts || []), "SEO Description": clean(body.seoDescription, 500), "Publication Date": body.publicationDate || null, "Round Two Enabled": Boolean(body.roundTwoEnabled), "Round Two Client Response": clean(body.roundTwoClientResponse), "Round Two Question": clean(body.roundTwoQuestion), "Round Two Answer Format": body.roundTwoAnswerFormat === "Multiple choice" ? "Multiple choice" : "Free text", "Round Two Choices JSON": JSON.stringify(body.roundTwoChoices || []), "Round Two Breakdown": clean(body.roundTwoBreakdown), "What Changed Between Decisions": clean(body.whatChangedBetweenDecisions), "Save Free-Text Responses": Boolean(body.saveFreeTextResponses), "Published URL": `https://theconfidentclinician.me/clinical-breakdowns/${slug}`, "Updated At": now,
  "Campaign Keyword": clean(body.campaignKeyword, 40).toUpperCase(), "Campaign Name": clean(body.campaignName, 150), "Instagram Hook": clean(body.instagramHook), "Instagram Caption": clean(body.instagramCaption), "Carousel Slides JSON": JSON.stringify(body.carouselSlides || []), "Public Replies JSON": JSON.stringify(body.publicReplies || []), "Opening DM": clean(body.openingDm), "ManyChat Button Label": clean(body.manychatButtonLabel, 80), "Link Delivery Message": clean(body.linkDeliveryMessage), "Follow Up Message": clean(body.followUpMessage), "Marblism Brief": clean(body.marblismBrief), "Campaign Status": clean(body.campaignStatus, 80) || "Draft package"
});
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
  if (event.httpMethod === "GET" && action === "dashboard") {
    if (!process.env.AIRTABLE_ACCESS_TOKEN) return json(503, { message: "Airtable is not configured." });
    try { const [exercises, attempts, responses, leads, history, events] = await Promise.all([list(TABLES.exercises), list(TABLES.attempts), list(TABLES.responses), list(TABLES.leads), list(TABLES.history), listEvents()]); return json(200, { exercises: exercises.map(mapExercise), attempts: attempts.map((record) => ({ id: record.id, ...record.fields })).reverse(), responses: responses.map((record) => ({ id: record.id, ...record.fields })).reverse(), leads: leads.map((record) => ({ id: record.id, ...record.fields })).reverse(), history: history.map((record) => ({ id: record.id, ...record.fields })).reverse(), events }); }
    catch (error) { console.error("practice-admin dashboard", error); return json(500, { message: "The admin data could not be loaded." }); }
  }
  if (event.httpMethod === "GET" && action === "preview-exercise") {
    if (!process.env.AIRTABLE_ACCESS_TOKEN) return json(503, { message: "Airtable is not configured." });
    try { const records = await list(TABLES.exercises); const found = records.find((record) => record.id === clean(event.queryStringParameters?.id, 100)); return found ? json(200, { exercise: mapExercise(found), adminPreview: true }) : json(404, { message: "That exercise could not be found." }); }
    catch (error) { console.error("practice-admin preview", error); return json(500, { message: "The preview could not be loaded." }); }
  }
  if (event.httpMethod === "POST" && action === "generate-campaign") {
    if (!process.env.AIRTABLE_ACCESS_TOKEN) return json(503, { message: "Airtable is not configured." });
    let body = {}; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { message: "Invalid campaign idea." }); }
    const idea = clean(body.idea, 4000);
    const type = body.type === "Clinical Case Lab" ? "Clinical Case Lab" : "The Clinical Response Check";
    if (idea.length < 20) return json(400, { message: "Add a little more detail about the clinical moment you want to create." });
    try {
      const generated = await generateCampaign({ idea, type, roundTwo: type === "Clinical Case Lab" && Boolean(body.roundTwo), keyword: clean(body.keyword, 40) });
      const existing = await list(TABLES.exercises);
      const nextNumber = String(Math.max(0, ...existing.map((record) => Number.parseInt(record.fields?.["Breakdown Number"], 10) || 0)) + 1).padStart(3, "0");
      const exerciseId = `practice-${nextNumber}`;
      const slug = clean(generated.exercise.slug, 150).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `practice-${nextNumber}`;
      const now = new Date().toISOString();
      const draft = { ...generated.exercise, type, number: nextNumber, status: "Draft", roundTwoEnabled: type === "Clinical Case Lab" && Boolean(body.roundTwo), saveFreeTextResponses: false, campaignKeyword: generated.promotion.keyword, campaignName: generated.promotion.campaignName, instagramHook: generated.promotion.instagramHook, instagramCaption: generated.promotion.instagramCaption, carouselSlides: generated.promotion.carouselSlides, publicReplies: generated.promotion.publicReplies, openingDm: generated.promotion.openingDm, manychatButtonLabel: generated.promotion.buttonLabel, linkDeliveryMessage: generated.promotion.linkDeliveryMessage, followUpMessage: generated.promotion.followUpMessage, marblismBrief: generated.promotion.marblismBrief, campaignStatus: "Draft package" };
      const fields = exerciseFields(draft, { exerciseId, slug, status: "Draft", now });
      fields["Created At"] = now;
      const saved = await write(TABLES.exercises, fields);
      await write(TABLES.history, { "History ID": `history-${Date.now()}`, "Event Type": "Exercise Created", "Exercise ID": exerciseId, Actor: session.email, "Details JSON": JSON.stringify({ source: "Quick Capture", slug, status: "Draft", campaign: draft.campaignName }), "Occurred At": now });
      return json(200, { exercise: mapExercise(saved), message: "Your exercise and campaign package were saved as a private draft." });
    } catch (error) {
      console.error("practice-admin generate", error);
      if (error.message === "OPENAI_API_KEY_MISSING") return json(503, { message: "AI generation needs an OpenAI API key added to Netlify first." });
      return json(500, { message: "The campaign draft could not be generated. Please try again." });
    }
  }
  if (event.httpMethod === "POST" && action === "save-exercise") {
    let body = {}; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { message: "Invalid exercise data." }); }
    const slug = clean(body.slug, 150).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || !clean(body.title, 200)) return json(400, { message: "Title and slug are required." });
    const now = new Date().toISOString(); const exerciseId = clean(body.exerciseId, 100) || `practice-${Date.now()}`; const status = ["Draft", "Published", "Unpublished", "Archived"].includes(body.status) ? body.status : "Draft";
    const fields = exerciseFields(body, { exerciseId, slug, status, now });
    if (!body.id) fields["Created At"] = now;
    try { const saved = await write(TABLES.exercises, fields, clean(body.id, 100)); await write(TABLES.history, { "History ID": `history-${Date.now()}`, "Event Type": body.id ? status === "Published" ? "Published" : "Exercise Updated" : "Exercise Created", "Exercise ID": exerciseId, Actor: session.email, "Details JSON": JSON.stringify({ slug, status }), "Occurred At": now }); return json(200, { exercise: mapExercise(saved) }); }
    catch (error) { console.error("practice-admin save", error); return json(500, { message: "The exercise could not be saved." }); }
  }
  if (event.httpMethod === "POST" && action === "save-response") {
    let body = {}; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { message: "Invalid response data." }); }
    const attemptId = clean(body.attemptId, 100); const attemptRecordId = clean(body.attemptRecordId, 100);
    if (!attemptId || !attemptRecordId) return json(400, { message: "The attempt could not be identified." });
    const responseStatus = ["Draft", "Ready", "Published", "Internal only"].includes(body.responseStatus) ? body.responseStatus : "Draft";
    const reviewStatus = ["New", "Reviewed", "Responded", "Archived"].includes(body.reviewStatus) ? body.reviewStatus : "Reviewed";
    const now = new Date().toISOString(); const responseId = clean(body.responseId, 100) || `response-${Date.now()}`;
    try {
      const saved = await write(TABLES.responses, { "Response ID": responseId, "Attempt ID": attemptId, "Exercise Slug": clean(body.exerciseSlug, 150), "Public Response": clean(body.publicResponse), "Internal Notes": clean(body.internalNotes), "Response Status": responseStatus, "Responded By": session.email, "Responded At": now }, clean(body.responseRecordId, 100));
      await write(TABLES.attempts, { "Review Status": reviewStatus }, attemptRecordId);
      await write(TABLES.history, { "History ID": `history-${Date.now()}`, "Event Type": "Admin Response Added", "Attempt ID": attemptId, "Admin Response ID": responseId, Actor: session.email, "Details JSON": JSON.stringify({ reviewStatus, responseStatus }), "Occurred At": now });
      return json(200, { response: { id: saved.id, ...saved.fields }, reviewStatus });
    } catch (error) { console.error("practice-admin response", error); return json(500, { message: "The response could not be saved." }); }
  }
  return json(405, { message: "Method not allowed." });
};
