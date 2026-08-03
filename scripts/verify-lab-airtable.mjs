const baseId = process.env.AIRTABLE_COURSE_BASE_ID || "app9RCJ6ivTCgwDsl";
const tableId = process.env.AIRTABLE_COURSE_CONTENT_TABLE_ID || "tblbR7GbCYnRoLLUm";
const token = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_TOKEN;
if (!token) throw new Error("Missing Airtable token");

const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
url.searchParams.set("pageSize", "100");
url.searchParams.set("filterByFormula", "AND({Program}='Clinical Confidence Lab',{Published}=TRUE(),{Week}>=1,{Week}<=4)");
const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(await response.text());
const records = (await response.json()).records || [];
const rows = records
  .map(({ fields }) => ({ week: fields.Week, order: fields.Order, title: fields.Title, tool: fields["Workbook Title"] }))
  .sort((a, b) => a.week - b.week || a.order - b.order);
console.log(JSON.stringify({ count: rows.length, byWeek: Object.groupBy(rows, (row) => `week${row.week}`) }, null, 2));
