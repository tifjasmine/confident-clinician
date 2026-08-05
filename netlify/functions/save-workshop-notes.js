const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const clean = (value) => String(value || '').trim();
const normalizeEmail = (value) => clean(value).toLowerCase();
const escapeFormula = (value) => clean(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const normalizeTitle = (value) => clean(value)
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/\bdo not\b/g, 'dont')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const listRecords = async ({ baseId, tableId, token, formula, maxRecords = 50 }) => {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
  url.searchParams.set('maxRecords', String(maxRecords));
  url.searchParams.set('filterByFormula', formula);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Airtable lookup failed with ${response.status}`);
  return response.json();
};

const verifySupabasePassword = async (email, password) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.ok;
};

const itemMatchesWorkshop = (item, workshop, resourceId) => {
  const itemTitle = normalizeTitle(item);
  if (resourceId === 'what-to-say-video') return itemTitle.includes('what to say when you dont know what to say');
  if (resourceId === 'five-skills-video') return itemTitle.includes('5 skills') || itemTitle.includes('five skills');
  return itemTitle === normalizeTitle(workshop);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: 'Please submit your notes again.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const usersTable = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const accessTable = process.env.AIRTABLE_WORKSHOP_ACCESS_TABLE_ID;
  const notesTable = process.env.AIRTABLE_NOTES_TABLE_ID || 'Workshop Notes';
  const email = normalizeEmail(payload.email);
  const password = clean(payload.password);
  const action = clean(payload.action || 'save').toLowerCase();
  const notes = String(payload.notes || '');
  const resourceId = clean(payload.resourceId || 'five-skills-video');
  const workshop = clean(payload.workshop || 'The 5 Skills That Separate New Therapists from Confident Clinicians');

  if (!token) return json(500, { ok: false, message: 'Workshop notes are temporarily unavailable.' });
  if (!email || !password) return json(400, { ok: false, message: 'Please enter your email and password before opening notes.' });
  if (action === 'save' && !notes.trim()) return json(400, { ok: false, message: 'Please write a note before saving.' });

  const expectedPassword = resourceId === 'what-to-say-video'
    ? process.env.WHAT_TO_SAY_ACCESS_PASSWORD
    : process.env.FIVE_SKILLS_ACCESS_PASSWORD;
  const passwordMatchesWorkshop = Boolean(expectedPassword && password === expectedPassword);
  const passwordMatchesAccount = passwordMatchesWorkshop ? false : await verifySupabasePassword(email, password);
  if (!passwordMatchesWorkshop && !passwordMatchesAccount) {
    return json(401, { ok: false, message: 'That password does not match.' });
  }

  try {
    const purchases = await listRecords({
      baseId,
      tableId: usersTable,
      token,
      formula: `AND(LOWER({Email})='${escapeFormula(email)}',{Purchased}=TRUE())`,
    });
    const purchaseRecord = purchases.records?.find((record) => itemMatchesWorkshop(record.fields?.Item, workshop, resourceId));
    let hasAccess = Boolean(purchaseRecord);

    if (!hasAccess && accessTable) {
      const registrations = await listRecords({
        baseId,
        tableId: accessTable,
        token,
        formula: `AND(LOWER({Email})='${escapeFormula(email)}',{Access Granted}=TRUE())`,
      });
      hasAccess = registrations.records?.some((record) => normalizeTitle(record.fields?.Workshop) === normalizeTitle(workshop));
    }

    if (!hasAccess) return json(403, { ok: false, message: 'I could not find access to this workshop for that email.' });

    const existing = await listRecords({
      baseId,
      tableId: notesTable,
      token,
      formula: `AND(LOWER({Name})='notes | ${escapeFormula(email)} | ${escapeFormula(resourceId)}',{Workshop}='${escapeFormula(workshop)}')`,
      maxRecords: 1,
    });
    let existingRecord = existing.records?.[0];
    if (!existingRecord && resourceId === 'five-skills-video') {
      const legacy = await listRecords({
        baseId,
        tableId: notesTable,
        token,
        formula: `AND({Name}='Notes - ${escapeFormula(email)}',{Workshop}='The 5 Skills Workshop')`,
        maxRecords: 1,
      });
      existingRecord = legacy.records?.[0];
    }

    if (action === 'load') {
      return json(200, {
        ok: true,
        notes: existingRecord?.fields?.Notes || '',
        updatedAt: existingRecord?.fields?.['Updated At'] || '',
      });
    }

    const fields = {
      Name: `Notes | ${email} | ${resourceId}`,
      Workshop: workshop,
      'Resource ID': resourceId,
      Notes: notes,
    };
    if (purchaseRecord) fields.Student = [purchaseRecord.id];

    const target = existingRecord
      ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(notesTable)}/${existingRecord.id}`
      : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(notesTable)}`;
    const response = await fetch(target, {
      method: existingRecord ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(existingRecord ? { fields, typecast: true } : { records: [{ fields }], typecast: true }),
    });
    if (!response.ok) throw new Error(`Airtable save failed with ${response.status}: ${await response.text()}`);
    return json(200, { ok: true, message: 'Saved.' });
  } catch (error) {
    console.error('Workshop notes failed', error);
    return json(500, { ok: false, message: 'Your notes could not be saved right now. Please try again.' });
  }
};
