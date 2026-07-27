const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const TABLES = {
  participants: process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9",
  activity: process.env.AIRTABLE_COURSE_ACTIVITY_TABLE_ID || "tblUggqFGAT3f21O5",
  submissions: process.env.AIRTABLE_COURSE_SUBMISSIONS_TABLE_ID || "tblvjyk8Sb0jF5RFN",
  questions: process.env.AIRTABLE_COURSE_QUESTIONS_TABLE_ID || "tblZgodoLmkg2QVjV",
};
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const formulaString = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const airtableHeaders = () => ({ Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, "Content-Type": "application/json" });
const airtableUrl = (tableId, recordId = "") => `https://api.airtable.com/v0/${BASE_ID}/${tableId}${recordId ? `/${recordId}` : ""}`;

const verifyUser = async (event) => {
  const token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const user = await response.json();
  return { id: user.id, email: normalizeEmail(user.email) };
};

const listRecords = async (tableId, formula = "", maxRecords = 100) => {
  const url = new URL(airtableUrl(tableId));
  url.searchParams.set("pageSize", String(Math.min(100, maxRecords)));
  if (formula) url.searchParams.set("filterByFormula", formula);
  const response = await fetch(url, { headers: airtableHeaders() });
  if (!response.ok) throw new Error(`Airtable read failed (${response.status})`);
  return (await response.json()).records || [];
};
const createRecord = async (tableId, fields) => {
  const response = await fetch(airtableUrl(tableId), {
    method: "POST", headers: airtableHeaders(), body: JSON.stringify({ fields, typecast: true }),
  });
  if (!response.ok) throw new Error(`Airtable create failed (${response.status})`);
  return response.json();
};
const updateRecord = async (tableId, recordId, fields) => {
  const response = await fetch(airtableUrl(tableId, recordId), {
    method: "PATCH", headers: airtableHeaders(), body: JSON.stringify({ fields, typecast: true }),
  });
  if (!response.ok) throw new Error(`Airtable update failed (${response.status})`);
  return response.json();
};
const findByEmail = async (tableId, email) => listRecords(tableId, `LOWER({Participant Email})='${formulaString(email)}'`);
const participantByEmail = async (email) => {
  const records = await listRecords(TABLES.participants, `LOWER({Email})='${formulaString(email)}'`, 1);
  return records[0] || null;
};

const mapProfile = (record, user) => {
  const fields = record.fields || {};
  const configuredAdmins = String(process.env.COURSE_ADMIN_EMAILS || process.env.COURSE_ADMIN_EMAIL || "admin@theconfidentclinician.me")
    .split(",").map(normalizeEmail).filter(Boolean);
  const isAdmin = fields.Role === "Admin" || configuredAdmins.includes(user.email);
  return {
    id: record.id, name: fields.Name || user.email.split("@")[0], email: user.email,
    role: isAdmin ? "Admin" : "Participant",
    cohort: fields.Cohort || "Founding Cohort",
    enrollmentStatus: fields["Enrollment Status"] || "Active",
    currentWeek: fields["Current Week"] || 1,
    overallProgress: fields["Overall Progress"] || 0,
    modulesAccessed: fields["Modules Accessed"] || 0,
    milestonesSubmitted: fields["Milestones Submitted"] || 0,
    mentorshipAttended: fields["Mentorship Sessions Attended"] || 0,
    clearApplications: fields["CLEAR Applications"] || 0,
    baselineComplete: Boolean(fields["Baseline Complete"]),
    midpointComplete: Boolean(fields["Midpoint Complete"]),
    finalComplete: Boolean(fields["Final Complete"]),
    lastActive: fields["Last Active"] || "",
    needsAttention: Boolean(fields["Needs Attention"]),
    feedbackDue: fields["Feedback Due"] || 0,
  };
};
const mapActivity = (record) => ({
  id: record.id, activityId: record.fields["Activity ID"], participantEmail: record.fields["Participant Email"],
  week: record.fields.Week, activityType: record.fields["Activity Type"], completed: Boolean(record.fields.Completed),
  completedAt: record.fields["Completed At"], response: record.fields.Response || "",
});
const mapSubmission = (record) => ({
  id: record.id, participantEmail: record.fields["Participant Email"], week: record.fields.Week,
  milestone: record.fields.Milestone, submission: record.fields.Submission || "", status: record.fields.Status || "Submitted",
  submittedAt: record.fields["Submitted At"] || "", feedback: record.fields.Feedback || "", feedbackAt: record.fields["Feedback At"] || "",
});
const mapQuestion = (record) => ({
  id: record.id, participantEmail: record.fields["Participant Email"], question: record.fields.Question || "",
  status: record.fields.Status || "New", submittedAt: record.fields["Submitted At"] || "",
  response: record.fields.Response || "", respondedAt: record.fields["Responded At"] || "",
});

const syncParticipantSummary = async (participant, email, activity, submissions) => {
  const completed = activity.filter((item) => item.completed);
  const modules = new Set(completed.filter((item) => item.activityType === "Lesson accessed").map((item) => item.week)).size;
  const clearApplications = completed.filter((item) => item.week >= 3 && item.activityType === "Case exercise completed").length;
  const progress = completed.length / (12 * 5);
  await updateRecord(TABLES.participants, participant.id, {
    "Supabase User ID": participant.userId,
    "Overall Progress": progress,
    "Modules Accessed": modules,
    "Milestones Submitted": submissions.length,
    "CLEAR Applications": clearApplications,
    "Feedback Due": submissions.filter((item) => item.status !== "Feedback returned").length,
    "Last Active": new Date().toISOString(),
    "Progress Data": JSON.stringify({ updatedAt: new Date().toISOString(), completed: completed.map((item) => `${item.week}:${item.activityType}`) }),
  });
};

exports.handler = async (event) => {
  if (!process.env.AIRTABLE_ACCESS_TOKEN) return json(500, { ok: false, message: "Course storage is not configured." });
  const user = await verifyUser(event);
  if (!user) return json(401, { ok: false, message: "Please sign in again." });
  const participantRecord = await participantByEmail(user.email);
  if (!participantRecord) return json(403, { ok: false, message: "Your course enrollment is not active yet. Contact admin@theconfidentclinician.me." });
  const profile = mapProfile(participantRecord, user);
  const action = new URLSearchParams(event.rawQuery || "").get("action") || event.queryStringParameters?.action || "me";
  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}

  try {
    if (action === "me") {
      await updateRecord(TABLES.participants, participantRecord.id, { "Supabase User ID": user.id, "Last Active": new Date().toISOString() });
      const [activityRecords, submissionRecords, questionRecords] = await Promise.all([
        findByEmail(TABLES.activity, user.email), findByEmail(TABLES.submissions, user.email), findByEmail(TABLES.questions, user.email),
      ]);
      return json(200, { ok: true, profile, activity: activityRecords.map(mapActivity), submissions: submissionRecords.map(mapSubmission), questions: questionRecords.map(mapQuestion) });
    }

    if (action === "save-activity" && event.httpMethod === "POST") {
      const week = Number(payload.week);
      const allowed = ["Lesson accessed", "Tool completed", "Case exercise completed", "Implementation completed", "Reflection completed", "Assessment completed", "Mentorship attended"];
      if (!Number.isInteger(week) || week < 1 || week > 12 || !allowed.includes(payload.activityType)) return json(400, { message: "That course activity is not valid." });
      const activityId = `${user.email}|${week}|${payload.activityType}`;
      const existing = await listRecords(TABLES.activity, `{Activity ID}='${formulaString(activityId)}'`, 1);
      const fields = { "Activity ID": activityId, "Participant Email": user.email, Week: week, "Activity Type": payload.activityType, Completed: Boolean(payload.completed), "Completed At": payload.completed ? new Date().toISOString() : null };
      if (existing[0]) await updateRecord(TABLES.activity, existing[0].id, fields); else await createRecord(TABLES.activity, fields);
      const [activityRecords, submissionRecords] = await Promise.all([findByEmail(TABLES.activity, user.email), findByEmail(TABLES.submissions, user.email)]);
      const activity = activityRecords.map(mapActivity);
      const submissions = submissionRecords.map(mapSubmission);
      await syncParticipantSummary({ id: participantRecord.id, userId: user.id }, user.email, activity, submissions);
      return json(200, { ok: true, activity });
    }

    if (action === "save-milestone" && event.httpMethod === "POST") {
      const week = Number(payload.week);
      const submission = String(payload.submission || "").trim();
      if (![1,3,5,7,9,12].includes(week) || submission.length < 10) return json(400, { message: "Add a little more reflection before submitting." });
      const submissionId = `${user.email}|week-${week}`;
      const existing = await listRecords(TABLES.submissions, `{Submission ID}='${formulaString(submissionId)}'`, 1);
      const fields = { "Submission ID": submissionId, "Participant Email": user.email, Week: week, Milestone: String(payload.milestone || `Week ${week} Milestone`), Submission: submission, Status: "Submitted", "Submitted At": new Date().toISOString() };
      if (existing[0]) await updateRecord(TABLES.submissions, existing[0].id, fields); else await createRecord(TABLES.submissions, fields);
      const [submissionRecords, activityRecords] = await Promise.all([findByEmail(TABLES.submissions, user.email), findByEmail(TABLES.activity, user.email)]);
      const submissions = submissionRecords.map(mapSubmission);
      await syncParticipantSummary({ id: participantRecord.id, userId: user.id }, user.email, activityRecords.map(mapActivity), submissions);
      return json(200, { ok: true, submissions });
    }

    if (action === "save-question" && event.httpMethod === "POST") {
      const question = String(payload.question || "").trim();
      if (question.length < 5) return json(400, { message: "Enter your question before sending." });
      await createRecord(TABLES.questions, { "Question ID": `${user.email}|${Date.now()}`, "Participant Email": user.email, Question: question, Status: "New", "Submitted At": new Date().toISOString() });
      const records = await findByEmail(TABLES.questions, user.email);
      return json(200, { ok: true, questions: records.map(mapQuestion) });
    }

    if (action === "save-assessment" && event.httpMethod === "POST") {
      if (!["baseline", "midpoint", "final"].includes(payload.kind) || !Array.isArray(payload.ratings) || payload.ratings.length !== 20) return json(400, { message: "Complete every rating before saving." });
      const activityId = `${user.email}|assessment|${payload.kind}`;
      const response = JSON.stringify({ ratings: payload.ratings, goal: String(payload.goal || "").trim() });
      const existing = await listRecords(TABLES.activity, `{Activity ID}='${formulaString(activityId)}'`, 1);
      const week = payload.kind === "baseline" ? 1 : payload.kind === "midpoint" ? 6 : 12;
      const fields = { "Activity ID": activityId, "Participant Email": user.email, Week: week, "Activity Type": "Assessment completed", Completed: true, "Completed At": new Date().toISOString(), Response: response };
      if (existing[0]) await updateRecord(TABLES.activity, existing[0].id, fields); else await createRecord(TABLES.activity, fields);
      const completionField = payload.kind === "baseline" ? "Baseline Complete" : payload.kind === "midpoint" ? "Midpoint Complete" : "Final Complete";
      const updated = await updateRecord(TABLES.participants, participantRecord.id, { [completionField]: true, "Last Active": new Date().toISOString() });
      const activity = (await findByEmail(TABLES.activity, user.email)).map(mapActivity);
      return json(200, { ok: true, activity, profile: mapProfile(updated, user) });
    }

    if (["admin-dashboard", "save-feedback", "answer-question"].includes(action)) {
      if (profile.role !== "Admin") return json(403, { message: "Admin access is required." });
      if (action === "save-feedback" && event.httpMethod === "POST") {
        await updateRecord(TABLES.submissions, payload.id, { Feedback: String(payload.feedback || "").trim(), Status: "Feedback returned", "Feedback At": new Date().toISOString() });
      }
      if (action === "answer-question" && event.httpMethod === "POST") {
        await updateRecord(TABLES.questions, payload.id, { Response: String(payload.response || "").trim(), Status: "Answered", "Responded At": new Date().toISOString() });
      }
      const [participants, submissions, questions] = await Promise.all([
        listRecords(TABLES.participants), listRecords(TABLES.submissions), listRecords(TABLES.questions),
      ]);
      return json(200, {
        ok: true,
        participants: participants.filter((record) => record.fields.Email).map((record) => mapProfile(record, { id: record.fields["Supabase User ID"], email: normalizeEmail(record.fields.Email) })),
        submissions: submissions.map(mapSubmission), questions: questions.map(mapQuestion),
      });
    }
    return json(404, { message: "Course action not found." });
  } catch (error) {
    console.error("Course API error", error);
    return json(500, { ok: false, message: "The course portal could not save that right now. Please try again." });
  }
};
