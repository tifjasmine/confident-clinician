import { spawnSync } from "node:child_process";

const BASE_ID = process.env.AIRTABLE_PURCHASES_BASE_ID || "appPQAC82txeqHx9R";
const TOKEN = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_TOKEN;

if (!TOKEN) throw new Error("AIRTABLE_ACCESS_TOKEN is required.");

const env = { ...process.env, AIRTABLE_TOKEN: TOKEN };

const run = (args, input) => {
  const result = spawnSync("airtable-mcp", [...args, "-q"], {
    env,
    encoding: "utf8",
    input: input ? JSON.stringify(input) : undefined,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `airtable-mcp ${args[0]} failed`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
};

const listTables = () => run(["list-tables-for-base", "--baseId", BASE_ID]);

const feedbackFields = [
  { name: "Participant Name", type: "singleLineText" },
  { name: "Email", type: "email" },
  { name: "Workshop", type: "singleLineText" },
  { name: "Overall Value", type: "number", options: { precision: 0 } },
  { name: "What Resonated", type: "multilineText" },
  { name: "What Could Be Better", type: "multilineText" },
  { name: "Recommend Score", type: "number", options: { precision: 0 } },
  { name: "Testimonial Consent", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Submitted At", type: "dateTime", options: { dateFormat: { name: "local" }, timeFormat: { name: "12hour" }, timeZone: "client" } },
  { name: "Source URL", type: "url" },
  { name: "Question Responses", type: "multilineText" },
];

const accessFields = [
  { name: "Registration", type: "singleLineText" },
  { name: "Participant Name", type: "singleLineText" },
  { name: "Email", type: "email" },
  { name: "Workshop", type: "singleLineText" },
  { name: "Access Granted", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Registered At", type: "dateTime", options: { dateFormat: { name: "local" }, timeFormat: { name: "12hour" }, timeZone: "client" } },
  { name: "Source URL", type: "url" },
];

const notesFields = [
  { name: "Workshop", type: "singleLineText" },
  { name: "Resource ID", type: "singleLineText" },
];

const viewFields = [
  { name: "Workshop", type: "singleLineText" },
  { name: "Resource ID", type: "singleLineText" },
  { name: "Participant Email", type: "email" },
];

const codeFields = [
  { name: "Code Record", type: "singleLineText" },
  { name: "Workshop or Offer", type: "singleLineText" },
  { name: "Code Type", type: "singleSelect", options: { choices: [{ name: "Password" }, { name: "Promo Code" }] } },
  { name: "Promo Code", type: "singleLineText" },
  { name: "Secret Reference", type: "singleLineText" },
  { name: "Status", type: "singleSelect", options: { choices: [{ name: "Active" }, { name: "Expired" }, { name: "Retired" }] } },
  { name: "Expires At", type: "date", options: { dateFormat: { name: "local" } } },
  { name: "Notes", type: "multilineText" },
];

const resourceFields = [
  { name: "Resource ID", type: "singleLineText" },
  { name: "Workshop", type: "singleLineText" },
  { name: "Title", type: "singleLineText" },
  {
    name: "Resource Type",
    type: "singleSelect",
    options: { choices: ["Video", "PDF", "Worksheet", "Guide", "Link"].map((name) => ({ name })) },
  },
  { name: "URL", type: "url" },
  { name: "Paid Access Required", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Published", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Sort Order", type: "number", options: { precision: 0 } },
  { name: "Description", type: "multilineText" },
  { name: "Downloadable", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "Added At", type: "dateTime", options: { dateFormat: { name: "local" }, timeFormat: { name: "12hour" }, timeZone: "client" } },
];

const withOptions = (field) => ({ ...field, options: field.options || {} });

let { tables } = listTables();
const feedbackTable = tables.find((table) => table.name === "Workshop Feedback");
if (!feedbackTable) throw new Error("Workshop Feedback table was not found.");

const existingFeedbackFields = new Set(feedbackTable.fields.map((field) => field.name));
for (const field of feedbackFields) {
  if (existingFeedbackFields.has(field.name)) continue;
  run(["create-field", "--input", "-"], {
    baseId: BASE_ID,
    tableId: feedbackTable.id,
    field: withOptions(field),
  });
}

const notesTable = tables.find((table) => table.name === "Workshop Notes");
if (!notesTable) throw new Error("Workshop Notes table was not found.");
const existingNotesFields = new Set(notesTable.fields.map((field) => field.name));
for (const field of notesFields) {
  if (existingNotesFields.has(field.name)) continue;
  run(["create-field", "--input", "-"], {
    baseId: BASE_ID,
    tableId: notesTable.id,
    field: withOptions(field),
  });
}

const viewsTable = tables.find((table) => table.name === "Workshop Views" || table.name === "Views");
if (!viewsTable) throw new Error("Workshop Views table was not found.");
const existingViewFields = new Set(viewsTable.fields.map((field) => field.name));
for (const field of viewFields) {
  if (existingViewFields.has(field.name)) continue;
  run(["create-field", "--input", "-"], {
    baseId: BASE_ID,
    tableId: viewsTable.id,
    field: withOptions(field),
  });
}

let resourceTable = tables.find((table) => table.name === "Workshop Resources");
if (!resourceTable) {
  run(["create-table", "--input", "-"], {
    baseId: BASE_ID,
    name: "Workshop Resources",
    description: "Central catalog for workshop videos, PDFs, worksheets, guides, and links. Paid resources remain protected by the site access flow.",
    fields: resourceFields.map(withOptions),
  });
  ({ tables } = listTables());
  resourceTable = tables.find((table) => table.name === "Workshop Resources");
}

if (!resourceTable) throw new Error("Workshop Resources table could not be created.");

let accessTable = tables.find((table) => table.name === "Workshop Access");
if (!accessTable) {
  run(["create-table", "--input", "-"], {
    baseId: BASE_ID,
    name: "Workshop Access",
    description: "Registrations that grant access to free or password protected workshops.",
    fields: accessFields.map(withOptions),
  });
  ({ tables } = listTables());
  accessTable = tables.find((table) => table.name === "Workshop Access");
}

if (!accessTable) throw new Error("Workshop Access table could not be created.");

let codesTable = tables.find((table) => table.name === "Workshop Codes");
if (!codesTable) {
  run(["create-table", "--input", "-"], {
    baseId: BASE_ID,
    name: "Workshop Codes",
    description: "Promo codes and references to passwords stored securely in Netlify. Password values are never stored in Airtable.",
    fields: codeFields.map(withOptions),
  });
  ({ tables } = listTables());
  codesTable = tables.find((table) => table.name === "Workshop Codes");
}
if (!codesTable) throw new Error("Workshop Codes table could not be created.");

const codeResponse = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${codesTable.id}?pageSize=100`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!codeResponse.ok) throw new Error(`Could not read workshop codes: ${codeResponse.status}`);
const existingCodes = await codeResponse.json();
const existingCodeRecords = new Set((existingCodes.records || []).map((record) => record.fields?.["Code Record"]));
const codeSeeds = [
  {
    record: "What to Say Workshop Password",
    offer: "What to Say When You Do Not Know What to Say",
    type: "Password",
    secret: "WHAT_TO_SAY_ACCESS_PASSWORD",
    status: "Active",
    notes: "The usable password is stored securely in Netlify environment variables.",
  },
  {
    record: "Five Skills Workshop Password",
    offer: "The 5 Skills That Separate New Therapists from Confident Clinicians",
    type: "Password",
    secret: "FIVE_SKILLS_ACCESS_PASSWORD",
    status: "Active",
    notes: "The usable password is stored securely in Netlify environment variables.",
  },
  {
    record: "Clinical Confidence Lab Launch Promotion",
    offer: "Clinical Confidence Lab",
    type: "Promo Code",
    promo: "LABLAUNCH100",
    status: "Active",
    expires: "2026-09-01",
    notes: "$100 early registration discount.",
  },
].filter((entry) => !existingCodeRecords.has(entry.record));

if (codeSeeds.length) {
  const fieldIds = Object.fromEntries(codesTable.fields.map((field) => [field.name, field.id]));
  run(["create-records-for-table", "--input", "-"], {
    baseId: BASE_ID,
    tableId: codesTable.id,
    records: codeSeeds.map((entry) => ({ fields: {
      [fieldIds["Code Record"]]: entry.record,
      [fieldIds["Workshop or Offer"]]: entry.offer,
      [fieldIds["Code Type"]]: entry.type,
      ...(entry.promo ? { [fieldIds["Promo Code"]]: entry.promo } : {}),
      ...(entry.secret ? { [fieldIds["Secret Reference"]]: entry.secret } : {}),
      [fieldIds.Status]: entry.status,
      ...(entry.expires ? { [fieldIds["Expires At"]]: entry.expires } : {}),
      [fieldIds.Notes]: entry.notes,
    } })),
  });
}

const resourceResponse = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${resourceTable.id}?pageSize=100`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!resourceResponse.ok) throw new Error(`Could not read workshop resources: ${resourceResponse.status}`);
const existingResources = await resourceResponse.json();
const existingResourceIds = new Set((existingResources.records || []).map((record) => record.fields?.["Resource ID"]));
const resourceSeeds = [
  {
    id: "what-to-say-video",
    workshop: "What to Say When You Do Not Know What to Say",
    title: "What to Say When You Do Not Know What to Say",
    url: "https://theconfidentclinician.wistia.com/s/l4kkufrc4hnryvq",
    description: "Private workshop video with the PAUSE framework and participant feedback form.",
  },
  {
    id: "five-skills-video",
    workshop: "The 5 Skills That Separate New Therapists from Confident Clinicians",
    title: "The 5 Skills That Separate New Therapists from Confident Clinicians",
    url: process.env.FIVE_SKILLS_VIDEO_EMBED_URL,
    description: "Private workshop video covering five foundational clinical confidence skills.",
  },
].filter((resource) => resource.url && !existingResourceIds.has(resource.id));

if (resourceSeeds.length) {
  const fieldIds = Object.fromEntries(resourceTable.fields.map((field) => [field.name, field.id]));
  const now = new Date().toISOString();
  run(["create-records-for-table", "--input", "-"], {
    baseId: BASE_ID,
    tableId: resourceTable.id,
    records: resourceSeeds.map((resource) => ({ fields: {
      [fieldIds["Resource ID"]]: resource.id,
      [fieldIds.Workshop]: resource.workshop,
      [fieldIds.Title]: resource.title,
      [fieldIds["Resource Type"]]: "Video",
      [fieldIds.URL]: resource.url,
      [fieldIds["Paid Access Required"]]: true,
      [fieldIds.Published]: true,
      [fieldIds["Sort Order"]]: 1,
      [fieldIds.Description]: resource.description,
      [fieldIds.Downloadable]: false,
      [fieldIds["Added At"]]: now,
    } })),
  });
}

console.log(JSON.stringify({
  feedbackTableId: feedbackTable.id,
  resourceTableId: resourceTable.id,
  accessTableId: accessTable.id,
  viewsTableId: viewsTable.id,
  codesTableId: codesTable.id,
  feedbackFieldsAdded: feedbackFields.filter((field) => !existingFeedbackFields.has(field.name)).map((field) => field.name),
  resourcesSeeded: resourceSeeds.map((resource) => resource.id),
  codesSeeded: codeSeeds.map((entry) => entry.record),
}, null, 2));
