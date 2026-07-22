const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const defaultFieldMap = {
  email: 'Email',
  purchased: 'Purchased',
};

const defaultNotesFieldMap = {
  name: 'Name',
  student: 'Student',
  workshop: 'Workshop',
  notes: 'Notes',
  updatedAt: 'Updated At',
};

const parseJsonEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env[name]) };
  } catch (error) {
    return fallback;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const airtableFormulaString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const findPurchasedRecordByEmail = async (email, fieldMap) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const emailField = fieldMap.email || 'Email';
  const purchasedField = fieldMap.purchased || 'Purchased';

  if (!token) return { configurationError: 'AIRTABLE_ACCESS_TOKEN is missing.' };

  const formula = `AND(LOWER({${emailField}})='${airtableFormulaString(email)}',{${purchasedField}})`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('filterByFormula', formula);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return { airtableError: response.status };

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const findExistingNotesRecord = async ({ email, purchaseRecordId, tableId, notesFieldMap }) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const nameField = notesFieldMap.name || 'Name';
  const studentField = notesFieldMap.student || 'Student';
  const workshopField = notesFieldMap.workshop || 'Workshop';
  const workshopName = 'The 5 Skills Workshop';
  const cleanEmail = airtableFormulaString(email);
  const cleanWorkshop = airtableFormulaString(workshopName);
  const formulas = [];

  if (purchaseRecordId && studentField) {
    formulas.push(`AND(FIND('${airtableFormulaString(purchaseRecordId)}',ARRAYJOIN({${studentField}})),{${workshopField}}='${cleanWorkshop}')`);
  }

  formulas.push(`AND({${nameField}}='Notes - ${cleanEmail}',{${workshopField}}='${cleanWorkshop}')`);
  formulas.push(`FIND('${cleanEmail}',LOWER({${nameField}}))`);

  for (const formula of formulas) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
    url.searchParams.set('maxRecords', '1');
    url.searchParams.set('filterByFormula', formula);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) continue;

    const result = await response.json();
    if (result.records && result.records.length > 0) {
      return result.records[0];
    }
  }

  return null;
};

const verifySupabasePassword = async (email, password) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return response.ok;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const accessPassword = process.env.FIVE_SKILLS_ACCESS_PASSWORD;
  if (!accessPassword) {
    return json(500, { ok: false, message: 'Workshop notes are temporarily unavailable. Please try again later.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit your notes again.' });
  }

  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '').trim();
  const action = String(payload.action || 'save').trim().toLowerCase();
  const notes = String(payload.notes || '');

  if (!email || !password) {
    return json(400, { ok: false, message: 'Please enter your email and password before opening notes.' });
  }

  if (action === 'save' && !notes.trim()) {
    return json(400, { ok: false, message: 'Please write a note before saving.' });
  }

  const passwordMatchesWorkshop = password === accessPassword;
  const passwordMatchesAccount = passwordMatchesWorkshop ? false : await verifySupabasePassword(email, password);

  if (!passwordMatchesWorkshop && !passwordMatchesAccount) {
    return json(401, { ok: false, message: 'That password does not match. Use your member password, or the workshop password from your welcome email.' });
  }

  const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
  const record = await findPurchasedRecordByEmail(email, fieldMap);

  if (record && record.configurationError) {
    return json(500, { ok: false, message: 'Workshop notes are temporarily unavailable. Please try again later.' });
  }

  if (record && record.airtableError) {
    return json(500, { ok: false, message: 'Workshop notes could not be checked right now. Please try again in a few minutes.' });
  }

  if (!record) {
    return json(403, { ok: false, message: 'I could not find a purchased workshop for that email yet.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_NOTES_TABLE_ID || 'Workshop Notes';
  const notesFieldMap = parseJsonEnv('AIRTABLE_NOTES_FIELD_MAP', defaultNotesFieldMap);
  const existingRecord = await findExistingNotesRecord({
    email,
    purchaseRecordId: record.id,
    tableId,
    notesFieldMap,
  });

  if (action === 'load') {
    return json(200, {
      ok: true,
      notes: existingRecord && existingRecord.fields
        ? existingRecord.fields[notesFieldMap.notes || 'Notes'] || ''
        : '',
      updatedAt: existingRecord && existingRecord.fields
        ? existingRecord.fields[notesFieldMap.updatedAt || 'Updated At'] || ''
        : '',
    });
  }

  const now = new Date().toISOString();
  const fullFields = {
    [notesFieldMap.name || 'Name']: `Notes - ${email}`,
    [notesFieldMap.workshop || 'Workshop']: 'The 5 Skills Workshop',
    [notesFieldMap.notes || 'Notes']: notes,
    [notesFieldMap.updatedAt || 'Updated At']: now,
  };

  if (notesFieldMap.student) {
    fullFields[notesFieldMap.student] = [record.id];
  }

  const updateRecord = (recordId, fields) => fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields,
      typecast: true,
    }),
  });

  const createRecord = (fields) => fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  let response = existingRecord
    ? await updateRecord(existingRecord.id, fullFields)
    : await createRecord(fullFields);

  if (!response.ok) {
    const message = await response.text();
    console.warn('Full Airtable notes save failed, trying simple save', message);

    const simpleFields = {
      [notesFieldMap.name || 'Name']: `Notes - ${email} - ${now}`,
      [notesFieldMap.notes || 'Notes']: notes,
    };

    response = existingRecord
      ? await updateRecord(existingRecord.id, simpleFields)
      : await createRecord(simpleFields);

    if (!response.ok) {
      const fallbackMessage = await response.text();
      console.error('Simple Airtable notes save failed', fallbackMessage);
      return json(500, {
        ok: false,
        message: 'Your note could not be saved right now. Please try again in a few minutes.',
      });
    }
  }

  return json(200, {
    ok: true,
    message: 'Saved.',
  });
};
