const crypto = require("node:crypto");

const BASE_ID = process.env.AIRTABLE_PRACTICE_BASE_ID || "appxvDBMXbODnk9tS";
const TABLES = {
  exercises: process.env.AIRTABLE_PRACTICE_EXERCISES_TABLE_ID || "tblPFguDAbHiU2pkl",
  attempts: process.env.AIRTABLE_PRACTICE_ATTEMPTS_TABLE_ID || "tblNwje2Qovijm7Yt",
  leads: process.env.AIRTABLE_PRACTICE_LEADS_TABLE_ID || "tblEvRzM42xU89aAe",
  history: process.env.AIRTABLE_PRACTICE_HISTORY_TABLE_ID || "tblCiSAdgO6QS3ECU",
  funnel: process.env.AIRTABLE_PRACTICE_FUNNEL_TABLE_ID || "tbl7RLsUtFoAjKOmM",
};

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const clean = (value, max = 10000) => String(value || "").trim().slice(0, max);
const safeJson = (value, fallback = []) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const formulaValue = (value) => clean(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const airtableHeaders = () => ({ Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" });
const airtableUrl = (table, id = "") => `https://api.airtable.com/v0/${BASE_ID}/${table}${id ? `/${id}` : ""}`;

async function list(table, formula = "", max = 100) {
  const url = new URL(airtableUrl(table));
  url.searchParams.set("pageSize", String(Math.min(max, 100)));
  if (formula) url.searchParams.set("filterByFormula", formula);
  const response = await fetch(url, { headers: airtableHeaders() });
  if (!response.ok) throw new Error(`Storage read failed (${response.status})`);
  return (await response.json()).records || [];
}
async function write(table, fields, id = "") {
  const response = await fetch(airtableUrl(table, id), { method: id ? "PATCH" : "POST", headers: airtableHeaders(), body: JSON.stringify({ fields, typecast: true }) });
  if (!response.ok) throw new Error(`Storage write failed (${response.status})`);
  return response.json();
}

const mapExercise = (record, includeTeaching = false) => {
  const f = record.fields || {};
  const type = f["Exercise Type"] === "What's Missing?" ? "The Clinical Response Check" : f["Exercise Type"];
  const base = { id: record.id, exerciseId: f["Exercise ID"], type, status: f.Status, number: f["Breakdown Number"], title: f.Title, slug: f.Slug, category: f.Category, summary: f.Summary, clientStatement: f["Client Statement"] || "", therapistResponse: f["Therapist Response"] || "", caseScenario: f["Case Scenario"] || "", reflectionQuestion: f["Reflection Question"] || "", hint: f.Hint || "", choices: safeJson(f["Choices JSON"]), publicationDate: f["Publication Date"] || "", seoDescription: f["SEO Description"] || f.Summary || "", roundTwoEnabled: Boolean(f["Round Two Enabled"]), roundTwoClientResponse: f["Round Two Client Response"] || "", roundTwoQuestion: f["Round Two Question"] || "", roundTwoAnswerFormat: f["Round Two Answer Format"] || "Free text", roundTwoChoices: safeJson(f["Round Two Choices JSON"]), saveFreeTextResponses: Boolean(f["Save Free-Text Responses"]) };
  if (!includeTeaching) return base;
  return { ...base, clinicalConsideration: f["Clinical Consideration"] || "", clinicalConsiderationExplanation: f["Clinical Consideration Explanation"] || "", therapistIntention: f["Therapist Intention"] || "", clinicalPoints: safeJson(f["Clinical Points JSON"]), alternatives: safeJson(f["Alternatives JSON"]), preferredStartingPoint: f["Preferred Starting Point"] || "", biggerLesson: f["Bigger Clinical Lesson"] || "", nuance: f["Context and Nuance"] || "", practicalApplication: f["Practical Application"] || "", reflectionPrompts: safeJson(f["Reflection Prompts JSON"]), roundTwoBreakdown: f["Round Two Breakdown"] || "", whatChangedBetweenDecisions: f["What Changed Between Decisions"] || "" };
};

const roundSecret = () => process.env.PRACTICE_REFERRAL_SECRET || process.env.PRACTICE_ADMIN_SESSION_SECRET || "";
const createRoundToken = (exercise, selectedOption) => {
  const payload = Buffer.from(JSON.stringify({ exerciseId: exercise.exerciseId, slug: exercise.slug, selectedOption, exp: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", roundSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const readRoundToken = (token) => {
  const [payload, signature] = clean(token, 3000).split("."); if (!payload || !signature || !roundSecret()) return null;
  const expected = crypto.createHmac("sha256", roundSecret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data.exp > Date.now() ? data : null; } catch { return null; }
};

const meaningfulResponse = (value) => {
  const text = clean(value, 2000).replace(/\s+/g, " ");
  if (text.length < 12 || text.split(/\s+/).length < 3) return "Share one brief clinical observation before viewing the breakdown.";
  const compact = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!compact || /^(.)\1{7,}$/.test(compact) || /(.)\1{6,}/.test(compact)) return "That looks like repeated characters. Try one concise clinical observation.";
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length >= 4 && new Set(words).size <= 2) return "Try describing one thing you notice about the therapist's response.";
  if (/^(test|testing|asdf|qwerty|hello|nothing|idk|n\/a)(\s+\1)*[.!]*$/i.test(text)) return "Try describing one thing you notice clinically before continuing.";
  return "";
};

const decodeReferral = (token) => {
  const secret = process.env.PRACTICE_REFERRAL_SECRET;
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data.exp > Date.now() && data.manychatContactId ? data : null; } catch { return null; }
};

async function checkRateLimit(sessionId) {
  if (!sessionId) return false;
  const records = await list(TABLES.attempts, `{Anonymous Session ID}='${formulaValue(sessionId)}'`, 20);
  const cutoff = Date.now() - 10 * 60 * 1000;
  return records.filter((record) => Date.parse(record.fields?.["Submitted At"] || 0) > cutoff).length >= 5;
}

async function history(eventType, fields = {}) {
  const now = new Date().toISOString();
  await write(TABLES.history, { "History ID": `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, "Event Type": eventType, ...fields, "Occurred At": now });
}

async function funnel(eventType, fields = {}) {
  await write(TABLES.funnel, { "Event ID": `event-${crypto.randomUUID()}`, "Event Type": eventType, "Event At": new Date().toISOString(), ...fields });
}

const funnelIdentity = (referral, body = {}) => ({
  "Instagram Handle": clean(referral?.instagramUsername, 100).replace(/^@/, "") || null,
  "ManyChat Contact ID": clean(referral?.manychatContactId, 150) || null,
  "Lead ID": clean(referral?.leadId, 150) || null,
  "Anonymous Session ID": clean(body.sessionId, 100) || null,
  Keyword: clean(body.keyword, 100) || null,
  "Trigger Type": clean(body.triggerType, 100) || null,
  Campaign: clean(body.campaign, 150) || null,
  "Exercise Reference": clean(body.exerciseId || body.slug || body.page, 100) || null,
});

exports.handler = async (event) => {
  if (!process.env.AIRTABLE_ACCESS_TOKEN) return reply(503, { message: "The practice library is being connected. Please try again shortly." });
  const params = event.queryStringParameters || {};
  const action = params.action || "list";
  try {
    if (event.httpMethod === "GET" && action === "list") {
      const records = await list(TABLES.exercises, "{Status}='Published'");
      return reply(200, { exercises: records.map((record) => mapExercise(record)).sort((a, b) => String(b.publicationDate).localeCompare(String(a.publicationDate))) });
    }
    if (event.httpMethod === "GET" && action === "exercise") {
      const records = await list(TABLES.exercises, `AND({Status}='Published',{Slug}='${formulaValue(params.slug)}')`, 1);
      return records[0] ? reply(200, { exercise: mapExercise(records[0]) }) : reply(404, { message: "That practice exercise is not available." });
    }
    if (event.httpMethod === "POST" && action === "submit") {
      const body = JSON.parse(event.body || "{}");
      const records = await list(TABLES.exercises, `AND({Status}='Published',{Slug}='${formulaValue(body.slug)}')`, 1);
      if (!records[0]) return reply(404, { message: "That practice exercise is not available." });
      const exercise = mapExercise(records[0], true);
      const responseText = clean(body.response, 2000);
      let selectedOption = clean(body.selectedOption, 4).toUpperCase();
      if (exercise.type === "The Clinical Response Check") { const problem = meaningfulResponse(responseText); if (problem) return reply(400, { message: problem }); }
      if (exercise.type === "Clinical Case Lab" && !body.roundTwoToken && !["A", "B", "C", "D"].includes(selectedOption)) return reply(400, { message: "Choose a response before revealing the analysis." });
      if (exercise.type === "Clinical Case Lab" && exercise.roundTwoEnabled && !body.roundTwoToken) {
        if (!roundSecret()) return reply(503, { message: "The second decision is temporarily unavailable." });
        return reply(200, { requiresRoundTwo: true, continuationToken: createRoundToken(exercise, selectedOption), roundTwo: { clientResponse: exercise.roundTwoClientResponse, question: exercise.roundTwoQuestion, answerFormat: exercise.roundTwoAnswerFormat, choices: exercise.roundTwoChoices }, saveFreeTextResponses: exercise.saveFreeTextResponses });
      }
      let roundTwoResponse = ""; let roundTwoSelectedOption = ""; let roundTwoRationale = "";
      if (exercise.type === "Clinical Case Lab" && exercise.roundTwoEnabled) {
        const continuation = readRoundToken(body.roundTwoToken);
        if (!continuation || continuation.exerciseId !== exercise.exerciseId || continuation.slug !== exercise.slug) return reply(400, { message: "That second-round session expired. Please begin the exercise again." });
        selectedOption = continuation.selectedOption;
        roundTwoResponse = clean(body.roundTwoResponse, 2000); roundTwoSelectedOption = clean(body.roundTwoSelectedOption, 4).toUpperCase(); roundTwoRationale = clean(body.roundTwoRationale, 2000);
        if (exercise.roundTwoAnswerFormat === "Multiple choice" && !["A", "B", "C", "D"].includes(roundTwoSelectedOption)) return reply(400, { message: "Choose a Round Two response before viewing the analysis." });
        if (exercise.roundTwoAnswerFormat !== "Multiple choice") { const problem = meaningfulResponse(roundTwoResponse); if (problem) return reply(400, { message: problem }); }
      }
      const sessionId = clean(body.sessionId, 100);
      if (await checkRateLimit(sessionId)) return reply(429, { message: "You've submitted several practices recently. Please wait a few minutes and try again." });
      const referral = decodeReferral(clean(body.referralToken, 2000));
      let instagramHandle = clean(referral?.instagramUsername, 100).replace(/^@/, "");
      if (referral?.leadId && !instagramHandle) {
        const referredLeads = await list(TABLES.leads, `{Lead ID}='${formulaValue(referral.leadId)}'`, 1);
        instagramHandle = clean(referredLeads[0]?.fields?.["Instagram Handle"], 100).replace(/^@/, "");
      }
      const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const storeText = exercise.saveFreeTextResponses;
      await write(TABLES.attempts, { "Attempt ID": attemptId, "Exercise ID": exercise.exerciseId, "Exercise Slug": exercise.slug, "Exercise Type": exercise.type, "Visitor Response": storeText && responseText ? responseText : null, "Selected Option": selectedOption || null, "Optional Rationale": storeText ? clean(body.rationale, 2000) || null : null, "Round Two Selected Option": roundTwoSelectedOption || null, "Round Two Response": storeText && roundTwoResponse ? roundTwoResponse : null, "Round Two Rationale": storeText && roundTwoRationale ? roundTwoRationale : null, "Anonymous Session ID": sessionId, Source: clean(body.source || "direct", 100), "Source Campaign": clean(body.campaign, 150), "Exercise Category": exercise.category, "Lead ID": referral?.leadId || null, "Instagram Handle": instagramHandle || null, Referrer: /^https?:\/\//.test(clean(body.referrer)) ? clean(body.referrer, 1000) : null, "Reveal Completed": true, "Review Status": "New", "Submitted At": now });
      await history("Attempt Submitted", { "Exercise ID": exercise.exerciseId, "Attempt ID": attemptId, Actor: referral ? "Verified referral" : "Unnamed visitor", "Details JSON": JSON.stringify({ source: clean(body.source || "direct", 100), category: exercise.category }) });
      await funnel("Exercise Submitted", { ...funnelIdentity(referral, { ...body, exerciseId: exercise.exerciseId }), "Attempt ID": attemptId, "Instagram Handle": instagramHandle || null });
      return reply(200, { attemptId, exercise, identityLinked: Boolean(referral) });
    }
    if (event.httpMethod === "POST" && action === "signup") {
      const body = JSON.parse(event.body || "{}");
      const firstName = clean(body.firstName, 80);
      const email = clean(body.email, 254).toLowerCase();
      if (!firstName) return reply(400, { message: "Please add your first name." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { message: "Please enter a valid email address." });
      if (body.consent !== true) return reply(400, { message: "Please check the consent box if you'd like weekly practice updates." });
      const now = new Date().toISOString();
      const found = await list(TABLES.leads, `LOWER({Email})='${formulaValue(email)}'`, 1);
      const current = found[0]?.fields || {};
      const leadId = current["Lead ID"] || `lead-${crypto.randomUUID()}`;
      const count = Number(current["Completion Count"] || 0) + 1;
      await write(TABLES.leads, { "Lead ID": leadId, "First Name": firstName, Email: email, Source: clean(body.source || "practice-library", 100), "Source Campaign": clean(body.campaign, 150), "Email Marketing Consent": true, "Consent Timestamp": now, "Exercise Reference": clean(body.exerciseId, 100), "Completion Count": count, "First Activity At": current["First Activity At"] || now, "Last Activity At": now }, found[0]?.id || "");
      const attempts = body.attemptId ? await list(TABLES.attempts, `{Attempt ID}='${formulaValue(body.attemptId)}'`, 1) : [];
      if (attempts[0]) await write(TABLES.attempts, { "Lead ID": leadId }, attempts[0].id);
      await history("Email Opt-In", { "Exercise ID": clean(body.exerciseId, 100), "Attempt ID": clean(body.attemptId, 100), Actor: "Practice lead", "Details JSON": JSON.stringify({ source: clean(body.source || "practice-library", 100) }) });
      const referral = decodeReferral(clean(body.referralToken, 2000));
      await funnel("Email Subscribed", { ...funnelIdentity(referral, body), "Lead ID": leadId, "Attempt ID": clean(body.attemptId, 100) || null });
      return reply(200, { ok: true, message: "You're in! Watch your inbox for the next clinical challenge." });
    }
    if (event.httpMethod === "POST" && action === "track") {
      const body = JSON.parse(event.body || "{}");
      if (!["Skool CTA Click", "Library View", "Exercise View"].includes(body.eventType)) return reply(400, { message: "Unsupported event." });
      const referral = decodeReferral(clean(body.referralToken, 2000));
      await history(body.eventType, { "Exercise ID": clean(body.exerciseId, 100), "Attempt ID": clean(body.attemptId, 100), Actor: referral ? "Verified referral" : "Website visitor", "Details JSON": JSON.stringify({ source: clean(body.source || "direct", 100), campaign: clean(body.campaign, 150), sessionId: clean(body.sessionId, 100), page: clean(body.page, 150), leadId: referral?.leadId || "", referrer: /^https?:\/\//.test(clean(body.referrer)) ? clean(body.referrer, 1000) : "" }) });
      if (body.eventType === "Exercise View") await funnel("Exercise Opened", funnelIdentity(referral, body));
      if (body.eventType === "Skool CTA Click") await funnel("Community Clicked", { ...funnelIdentity(referral, body), "Attempt ID": clean(body.attemptId, 100) || null });
      return reply(200, { ok: true });
    }
    return reply(405, { message: "Method not allowed." });
  } catch (error) { console.error("practice-library", error); return reply(500, { message: "The practice library could not complete that request. Please try again." }); }
};
