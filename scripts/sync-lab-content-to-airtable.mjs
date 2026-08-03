import fs from "node:fs";
import vm from "node:vm";

const BASE_ID = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const TABLE_ID = process.env.AIRTABLE_COURSE_CONTENT_TABLE_ID || "tblbR7GbCYnRoLLUm";
const TOKEN = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_TOKEN;
const PROGRAM = "Clinical Confidence Lab";

if (!TOKEN) throw new Error("Set AIRTABLE_ACCESS_TOKEN or AIRTABLE_TOKEN before running this sync.");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../course/lab-content-plan.js", import.meta.url), "utf8"), context);
const plan = [...context.window.TCC_LAB_ORIENTATION_PLAN, ...context.window.TCC_LAB_CONTENT_PLAN];

const api = (recordId = "") => `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${recordId ? `/${recordId}` : ""}`;
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const request = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
  return response.json();
};

const listAll = async () => {
  const records = [];
  let offset = "";
  do {
    const url = new URL(api());
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("filterByFormula", `{Program}='${PROGRAM}'`);
    if (offset) url.searchParams.set("offset", offset);
    const page = await request(url);
    records.push(...(page.records || []));
    offset = page.offset || "";
  } while (offset);
  return records;
};

const fieldsFor = (item, existing) => ({
  "Content ID": item.contentId,
  Program: item.program,
  Week: item.week,
  Order: item.order,
  Title: item.title,
  Description: item.description || "",
  "Content Type": item.contentType,
  "Video URL": item.videoUrl || existing?.fields?.["Video URL"] || null,
  "Download URL": item.downloadUrl || existing?.fields?.["Download URL"] || null,
  "Transcript URL": item.transcriptUrl || existing?.fields?.["Transcript URL"] || null,
  "Workbook Title": item.workbookTitle || null,
  "Workbook Prompts": item.workbookPrompts.join("\n") || null,
  "Stopping Statement": item.stoppingStatement || null,
  Published: item.published || Boolean(existing?.fields?.Published && existing?.fields?.["Video URL"]),
});

const chunks = (values, size = 10) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const existing = await listAll();
const byId = new Map(existing.map((record) => [record.fields["Content ID"], record]));
const byWeekAndTitle = new Map(existing.map((record) => [`${record.fields.Week}|${record.fields.Title}`, record]));
const currentIds = new Set(plan.map((item) => item.contentId));

const upserts = plan.map((item) => {
  const record = byId.get(item.contentId) || byWeekAndTitle.get(`${item.week}|${item.title}`);
  return record ? { id: record.id, fields: fieldsFor(item, record) } : { fields: fieldsFor(item) };
});

for (const batch of chunks(upserts)) {
  await request(api(), { method: "PATCH", body: JSON.stringify({ records: batch, typecast: true, performUpsert: { fieldsToMergeOn: ["Content ID"] } }) });
}

const retired = existing.filter((record) => !currentIds.has(record.fields["Content ID"]) && record.fields.Published);
for (const batch of chunks(retired.map((record) => ({ id: record.id, fields: { Published: false } })))) {
  await request(api(), { method: "PATCH", body: JSON.stringify({ records: batch, typecast: true }) });
}

console.log(`Synced ${plan.length} Lab records and retired ${retired.length} old published records.`);
