const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const TABLES = {
  participants: process.env.AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID || "tbl9GaXjTRDTm4eg9",
  activity: process.env.AIRTABLE_COURSE_ACTIVITY_TABLE_ID || "tblUggqFGAT3f21O5",
  submissions: process.env.AIRTABLE_COURSE_SUBMISSIONS_TABLE_ID || "tblvjyk8Sb0jF5RFN",
  questions: process.env.AIRTABLE_COURSE_QUESTIONS_TABLE_ID || "tblZgodoLmkg2QVjV",
  content: process.env.AIRTABLE_COURSE_CONTENT_TABLE_ID || "tblbR7GbCYnRoLLUm",
  assessments: process.env.AIRTABLE_COURSE_ASSESSMENTS_TABLE_ID || "tblDB1IkqgRT9bjYZ",
  coaching: process.env.AIRTABLE_COURSE_COACHING_TABLE_ID || "tbl975NGzYmTTtcCc",
  workbook: process.env.AIRTABLE_COURSE_WORKBOOK_TABLE_ID || "tblEUY3qUu82ysKUL",
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
    program: fields.Program || "Confident Clinician Intensive",
    programVersion: fields["Program Version"] || "",
    programWeeks: fields["Program Weeks"] || (fields.Program === "Clinical Confidence Lab" ? 4 : 12),
    cohort: fields.Cohort || "Founding Cohort",
    enrollmentStatus: fields["Enrollment Status"] || "Active",
    paymentStatus: fields["Payment Status"] || "",
    onboardingStatus: fields["Onboarding Status"] || "",
    agreementSigned: Boolean(fields["Participation Agreement Signed"]),
    intakeComplete: Boolean(fields["Intake Complete"]),
    readyForPortal: Boolean(fields["Ready for Portal"]),
    accessStarts: fields["Access Starts"] || "",
    accessEnds: fields["Access Ends"] || "",
    coachingCallStatus: fields["Coaching Call Status"] || "Not booked",
    coachingCallAt: fields["Coaching Call At"] || "",
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
const mapContent = (record) => ({
  id: record.id,
  contentId: record.fields["Content ID"] || "",
  program: record.fields.Program || "",
  week: Number(record.fields.Week || 0),
  order: Number(record.fields.Order || 0),
  title: record.fields.Title || "",
  description: record.fields.Description || "",
  contentType: record.fields["Content Type"] || "Lesson",
  videoUrl: record.fields["Video URL"] || "",
  downloadUrl: record.fields["Download URL"] || "",
  transcriptUrl: record.fields["Transcript URL"] || "",
  summaryLabel: record.fields["Download URL"] ? `Read the Video ${Number(record.fields.Order || 0) / 10} Summary` : "",
  recapUrl: record.fields["Content ID"] === "lab-week-1-lesson-8" ? "https://theconfidentclinician.me/course/resources/week-1/week-1-cheat-sheet.pdf" : "",
  files: record.fields.Files || [],
  workbookTitle: record.fields["Workbook Title"] || "",
  workbookPrompts: String(record.fields["Workbook Prompts"] || "").split("\n").map((prompt) => prompt.trim()).filter(Boolean),
  stoppingStatement: record.fields["Stopping Statement"] || "",
  published: Boolean(record.fields.Published),
});
const mapWorkbookResponse = (record) => {
  let responses = [];
  try { responses = JSON.parse(record.fields["Responses JSON"] || "[]"); } catch {}
  return {
    id: record.id,
    participantEmail: record.fields["Participant Email"] || "",
    responseId: record.fields["Response ID"] || "",
    contentId: record.fields["Content ID"] || "",
    week: Number(record.fields.Week || 0),
    responses: Array.isArray(responses) ? responses : [],
    savedAt: record.fields["Saved At"] || "",
  };
};
const mapFormResponse = (record) => {
  let responses = {};
  let scoreSummary = {};
  try { responses = JSON.parse(record.fields["Responses JSON"] || "{}"); } catch {}
  try { scoreSummary = JSON.parse(record.fields["Score Summary JSON"] || "{}"); } catch {}
  return {
    id: record.id,
    participantEmail: record.fields["Participant Email"] || "",
    formKey: record.fields["Form Key"] || "",
    week: Number(record.fields.Week || 0),
    responses: responses && typeof responses === "object" ? responses : {},
    scoreSummary,
    submittedAt: record.fields["Submitted At"] || "",
  };
};

const syncParticipantSummary = async (participant, email, activity, submissions) => {
  const completed = activity.filter((item) => item.completed);
  const modules = new Set(completed.filter((item) => item.activityType === "Lesson accessed").map((item) => item.response || `week-${item.week}`)).size;
  const clearApplications = completed.filter((item) => item.week >= 3 && item.activityType === "Case exercise completed").length;
  const totalWeeks = Number(participant.programWeeks || 12);
  const activityTypesPerWeek = participant.program === "Clinical Confidence Lab" ? 4 : 5;
  const progress = Math.min(1, completed.length / (totalWeeks * activityTypesPerWeek));
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
      const contentFormula = `AND({Published}=1,{Program}='${formulaString(profile.program)}')`;
      const [activityRecords, submissionRecords, questionRecords, contentRecords, workbookRecords, formRecords] = await Promise.all([
        findByEmail(TABLES.activity, user.email), findByEmail(TABLES.submissions, user.email), findByEmail(TABLES.questions, user.email),
        listRecords(TABLES.content, contentFormula),
        findByEmail(TABLES.workbook, user.email),
        findByEmail(TABLES.assessments, user.email),
      ]);
      return json(200, {
        ok: true,
        profile,
        activity: activityRecords.map(mapActivity),
        submissions: submissionRecords.map(mapSubmission),
        questions: questionRecords.map(mapQuestion),
        content: contentRecords.map(mapContent).sort((a, b) => a.week - b.week || a.order - b.order),
        workbookResponses: workbookRecords.map(mapWorkbookResponse),
        formResponses: formRecords.map(mapFormResponse),
      });
    }

    if (action === "save-workbook" && event.httpMethod === "POST") {
      const week = Number(payload.week);
      const contentId = String(payload.contentId || "").trim();
      const responses = Array.isArray(payload.responses) ? payload.responses.map((value) => String(value || "").slice(0, 10000)) : [];
      const content = await listRecords(TABLES.content, `AND({Content ID}='${formulaString(contentId)}',{Program}='${formulaString(profile.program)}',{Published}=1)`, 1);
      const prompts = content[0] ? mapContent(content[0]).workbookPrompts : [];
      const minimumWeek = profile.program === "Clinical Confidence Lab" ? 0 : 1;
      if (!contentId || !Number.isInteger(week) || week < minimumWeek || week > profile.programWeeks || !prompts.length || responses.length !== prompts.length) {
        return json(400, { message: "That workbook section is not available." });
      }
      const responseId = `${user.email}|${profile.program}|${contentId}`;
      const existing = await listRecords(TABLES.workbook, `{Response ID}='${formulaString(responseId)}'`, 1);
      const fields = {
        "Response ID": responseId,
        "Participant Email": user.email,
        Program: profile.program,
        Cohort: profile.cohort,
        "Content ID": contentId,
        Week: week,
        "Responses JSON": JSON.stringify(responses),
        "Saved At": new Date().toISOString(),
      };
      if (existing[0]) await updateRecord(TABLES.workbook, existing[0].id, fields);
      else await createRecord(TABLES.workbook, fields);
      const workbookResponses = (await findByEmail(TABLES.workbook, user.email)).map(mapWorkbookResponse);
      return json(200, { ok: true, workbookResponses });
    }

    if (action === "save-course-form" && event.httpMethod === "POST") {
      if (profile.program !== "Clinical Confidence Lab") return json(400, { message: "That form is not available for this program." });
      const formKey = String(payload.formKey || "").trim();
      const allowed = ["baseline", "success-plan", "pulse-1", "pulse-2", "pulse-3", "pulse-4", "post", "capstone", "call-prep"];
      if (!allowed.includes(formKey) || !payload.responses || typeof payload.responses !== "object" || Array.isArray(payload.responses)) {
        return json(400, { message: "That course form is not valid." });
      }
      const serialized = JSON.stringify(payload.responses);
      if (serialized.length > 100000) return json(400, { message: "That response is too long to save." });
      const values = Object.fromEntries(Object.entries(payload.responses).map(([key, value]) => [String(key).slice(0, 100), typeof value === "boolean" ? value : String(value || "").slice(0, 10000)]));
      const confidence = Object.entries(values).filter(([key]) => /^(post-)?confidence-\d+$/.test(key)).map(([, value]) => Number(value)).filter(Number.isFinite);
      const interference = Object.entries(values).filter(([key]) => /^(post-)?interference-\d+$/.test(key)).map(([, value]) => Number(value)).filter(Number.isFinite);
      const scoreSummary = {
        clinicalConfidenceIndex: confidence.length === 20 ? Math.round((confidence.reduce((sum, value) => sum + value, 0) / 20) * 10) : null,
        clinicalInterferenceIndex: interference.length === 10 ? Number((interference.reduce((sum, value) => sum + value, 0) / 10).toFixed(2)) : null,
      };
      const week = formKey.startsWith("pulse-") ? Number(formKey.split("-")[1]) : ["post", "capstone", "call-prep"].includes(formKey) ? 4 : 0;
      const assessmentId = `${user.email}|${profile.program}|${formKey}`;
      const existing = await listRecords(TABLES.assessments, `{Assessment ID}='${formulaString(assessmentId)}'`, 1);
      const assessmentType = formKey === "baseline" ? "Baseline" : ["post", "capstone"].includes(formKey) ? "Final" : "Midpoint";
      const fields = {
        "Assessment ID": assessmentId,
        "Participant Email": user.email,
        Program: profile.program,
        Cohort: profile.cohort,
        "Assessment Type": assessmentType,
        "Form Key": formKey,
        Week: week || null,
        "Responses JSON": JSON.stringify(values),
        "Ratings JSON": JSON.stringify(values),
        "Score Summary JSON": JSON.stringify(scoreSummary),
        "Goal / Reflection": String(values["desired-change"] || values["continue"] || values["next-behavior"] || "").slice(0, 10000),
        "Submitted At": new Date().toISOString(),
      };
      if (existing[0]) await updateRecord(TABLES.assessments, existing[0].id, fields);
      else await createRecord(TABLES.assessments, fields);
      const participantFields = { "Last Active": new Date().toISOString() };
      if (formKey === "baseline") participantFields["Baseline Complete"] = true;
      if (formKey === "post") participantFields["Final Complete"] = true;
      const updated = await updateRecord(TABLES.participants, participantRecord.id, participantFields);
      const formResponses = (await findByEmail(TABLES.assessments, user.email)).map(mapFormResponse);
      return json(200, { ok: true, formResponses, profile: mapProfile(updated, user), scoreSummary });
    }

    if (action === "save-activity" && event.httpMethod === "POST") {
      const week = Number(payload.week);
      const allowed = ["Lesson accessed", "Tool completed", "Case exercise completed", "Implementation completed", "Reflection completed", "Assessment completed", "Mentorship attended"];
      const minimumWeek = profile.program === "Clinical Confidence Lab" ? 0 : 1;
      if (!Number.isInteger(week) || week < minimumWeek || week > profile.programWeeks || !allowed.includes(payload.activityType)) return json(400, { message: "That course activity is not valid." });
      const contentId = payload.activityType === "Lesson accessed" ? String(payload.contentId || "").trim() : "";
      if (payload.activityType === "Lesson accessed") {
        const content = await listRecords(TABLES.content, `AND({Content ID}='${formulaString(contentId)}',{Program}='${formulaString(profile.program)}',{Published}=1)`, 1);
        if (!contentId || !content[0] || Number(content[0].fields.Week) !== week || !content[0].fields["Video URL"]) return json(400, { message: "That lesson video is not available." });
      }
      const activityId = `${user.email}|${profile.program}|${week}|${payload.activityType}${contentId ? `|${contentId}` : ""}`;
      const existing = await listRecords(TABLES.activity, `{Activity ID}='${formulaString(activityId)}'`, 1);
      const fields = { "Activity ID": activityId, "Participant Email": user.email, Program: profile.program, Cohort: profile.cohort, Week: week, "Activity Type": payload.activityType, Completed: Boolean(payload.completed), "Completed At": payload.completed ? new Date().toISOString() : null, Response: contentId || null };
      if (existing[0]) await updateRecord(TABLES.activity, existing[0].id, fields); else await createRecord(TABLES.activity, fields);
      const [activityRecords, submissionRecords] = await Promise.all([findByEmail(TABLES.activity, user.email), findByEmail(TABLES.submissions, user.email)]);
      const activity = activityRecords.map(mapActivity);
      const submissions = submissionRecords.map(mapSubmission);
      await syncParticipantSummary({ id: participantRecord.id, userId: user.id, program: profile.program, programWeeks: profile.programWeeks }, user.email, activity, submissions);
      return json(200, { ok: true, activity });
    }

    if (action === "save-milestone" && event.httpMethod === "POST") {
      const week = Number(payload.week);
      const submission = String(payload.submission || "").trim();
      const allowedWeeks = profile.program === "Clinical Confidence Lab" ? [1, 2, 3, 4] : [1, 3, 5, 7, 9, 12];
      if (!allowedWeeks.includes(week) || submission.length < 10) return json(400, { message: "Add a little more reflection before submitting." });
      const submissionId = `${user.email}|${profile.program}|week-${week}`;
      const existing = await listRecords(TABLES.submissions, `{Submission ID}='${formulaString(submissionId)}'`, 1);
      const fields = { "Submission ID": submissionId, "Participant Email": user.email, Program: profile.program, Cohort: profile.cohort, Week: week, Milestone: String(payload.milestone || `Week ${week} Milestone`), Submission: submission, Status: "Submitted", "Submitted At": new Date().toISOString() };
      if (existing[0]) await updateRecord(TABLES.submissions, existing[0].id, fields); else await createRecord(TABLES.submissions, fields);
      const [submissionRecords, activityRecords] = await Promise.all([findByEmail(TABLES.submissions, user.email), findByEmail(TABLES.activity, user.email)]);
      const submissions = submissionRecords.map(mapSubmission);
      await syncParticipantSummary({ id: participantRecord.id, userId: user.id, program: profile.program, programWeeks: profile.programWeeks }, user.email, activityRecords.map(mapActivity), submissions);
      return json(200, { ok: true, submissions });
    }

    if (action === "save-question" && event.httpMethod === "POST") {
      const question = String(payload.question || "").trim();
      if (question.length < 5) return json(400, { message: "Enter your question before sending." });
      await createRecord(TABLES.questions, { "Question ID": `${user.email}|${Date.now()}`, "Participant Email": user.email, Program: profile.program, Cohort: profile.cohort, Question: question, Status: "New", "Submitted At": new Date().toISOString() });
      const records = await findByEmail(TABLES.questions, user.email);
      return json(200, { ok: true, questions: records.map(mapQuestion) });
    }

    if (action === "save-assessment" && event.httpMethod === "POST") {
      const allowedAssessments = profile.program === "Clinical Confidence Lab" ? ["baseline", "final"] : ["baseline", "midpoint", "final"];
      if (!allowedAssessments.includes(payload.kind) || !Array.isArray(payload.ratings) || payload.ratings.length !== 20) return json(400, { message: "Complete every rating before saving." });
      const activityId = `${user.email}|${profile.program}|assessment|${payload.kind}`;
      const response = JSON.stringify({ ratings: payload.ratings, goal: String(payload.goal || "").trim() });
      const existing = await listRecords(TABLES.activity, `{Activity ID}='${formulaString(activityId)}'`, 1);
      const week = payload.kind === "baseline" ? 1 : payload.kind === "midpoint" ? Math.ceil(profile.programWeeks / 2) : profile.programWeeks;
      const fields = { "Activity ID": activityId, "Participant Email": user.email, Program: profile.program, Cohort: profile.cohort, Week: week, "Activity Type": "Assessment completed", Completed: true, "Completed At": new Date().toISOString(), Response: response };
      if (existing[0]) await updateRecord(TABLES.activity, existing[0].id, fields); else await createRecord(TABLES.activity, fields);
      const assessmentId = `${user.email}|${profile.program}|${payload.kind}`;
      const existingAssessment = await listRecords(TABLES.assessments, `{Assessment ID}='${formulaString(assessmentId)}'`, 1);
      const assessmentFields = {
        "Assessment ID": assessmentId,
        "Participant Email": user.email,
        Program: profile.program,
        Cohort: profile.cohort,
        "Assessment Type": payload.kind === "baseline" ? "Baseline" : payload.kind === "midpoint" ? "Midpoint" : "Final",
        "Ratings JSON": JSON.stringify(payload.ratings),
        "Goal / Reflection": String(payload.goal || "").trim(),
        "Submitted At": new Date().toISOString(),
      };
      if (existingAssessment[0]) await updateRecord(TABLES.assessments, existingAssessment[0].id, assessmentFields);
      else await createRecord(TABLES.assessments, assessmentFields);
      const completionField = payload.kind === "baseline" ? "Baseline Complete" : payload.kind === "midpoint" ? "Midpoint Complete" : "Final Complete";
      const updated = await updateRecord(TABLES.participants, participantRecord.id, { [completionField]: true, "Last Active": new Date().toISOString() });
      const activity = (await findByEmail(TABLES.activity, user.email)).map(mapActivity);
      return json(200, { ok: true, activity, profile: mapProfile(updated, user) });
    }

    if (["admin-dashboard", "save-feedback", "answer-question", "save-content"].includes(action)) {
      if (profile.role !== "Admin") return json(403, { message: "Admin access is required." });
      if (action === "save-feedback" && event.httpMethod === "POST") {
        await updateRecord(TABLES.submissions, payload.id, { Feedback: String(payload.feedback || "").trim(), Status: "Feedback returned", "Feedback At": new Date().toISOString() });
      }
      if (action === "answer-question" && event.httpMethod === "POST") {
        await updateRecord(TABLES.questions, payload.id, { Response: String(payload.response || "").trim(), Status: "Answered", "Responded At": new Date().toISOString() });
      }
      if (action === "save-content" && event.httpMethod === "POST") {
        const program = ["Clinical Confidence Lab", "Confident Clinician Intensive"].includes(payload.program)
          ? payload.program
          : "Clinical Confidence Lab";
        const week = Number(payload.week);
        const maxWeek = program === "Clinical Confidence Lab" ? 4 : 12;
        const title = String(payload.title || "").trim();
        if (!Number.isInteger(week) || week < 1 || week > maxWeek || !title) {
          return json(400, { message: "Choose a valid program and week, then add a title." });
        }
        const contentId = String(payload.contentId || `${program}|week-${week}|${Date.now()}`).trim();
        const fields = {
          "Content ID": contentId,
          Program: program,
          Week: week,
          Order: Number(payload.order || 1),
          Title: title,
          Description: String(payload.description || "").trim(),
          "Content Type": String(payload.contentType || "Lesson"),
          "Video URL": String(payload.videoUrl || "").trim() || null,
          "Download URL": String(payload.downloadUrl || "").trim() || null,
          "Transcript URL": String(payload.transcriptUrl || "").trim() || null,
          "Workbook Title": String(payload.workbookTitle || "").trim() || null,
          "Workbook Prompts": String(payload.workbookPrompts || "").trim() || null,
          "Stopping Statement": String(payload.stoppingStatement || "").trim() || null,
          Published: Boolean(payload.published),
        };
        const existing = await listRecords(TABLES.content, `{Content ID}='${formulaString(contentId)}'`, 1);
        if (existing[0]) await updateRecord(TABLES.content, existing[0].id, fields);
        else await createRecord(TABLES.content, fields);
      }
      const [participants, submissions, questions, content, assessments] = await Promise.all([
        listRecords(TABLES.participants), listRecords(TABLES.submissions), listRecords(TABLES.questions), listRecords(TABLES.content), listRecords(TABLES.assessments),
      ]);
      return json(200, {
        ok: true,
        participants: participants.filter((record) => record.fields.Email).map((record) => mapProfile(record, { id: record.fields["Supabase User ID"], email: normalizeEmail(record.fields.Email) })),
        submissions: submissions.map(mapSubmission),
        questions: questions.map(mapQuestion),
        content: content.map(mapContent).sort((a, b) => a.program.localeCompare(b.program) || a.week - b.week || a.order - b.order),
        assessments: assessments.map(mapFormResponse).filter((item) => item.formKey),
      });
    }
    return json(404, { message: "Course action not found." });
  } catch (error) {
    console.error("Course API error", error);
    return json(500, { ok: false, message: "The course portal could not save that right now. Please try again." });
  }
};
