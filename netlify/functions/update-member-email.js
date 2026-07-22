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

const verifySupabasePassword = async (email, password) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { configurationError: 'Account updates are temporarily unavailable.' };
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    accessToken: result.access_token,
    userId: result.user?.id,
  };
};

const updateSupabaseEmail = async ({ accessToken, newEmail }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: newEmail }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase email update failed: ${response.status} ${message}`);
  }
};

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
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return { airtableError: response.status };

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const updateAirtableEmail = async ({ recordId, newEmail, fieldMap }) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const emailField = fieldMap.email || 'Email';

  if (!token) return;

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: { [emailField]: newEmail },
      typecast: true,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Airtable email update failed: ${response.status} ${message}`);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit the form again.' });
  }

  const email = normalizeEmail(payload.email);
  const newEmail = normalizeEmail(payload.newEmail);
  const password = String(payload.password || '').trim();

  if (!email || !newEmail || !password) {
    return json(400, { ok: false, message: 'Please enter your current email, current password, and new email.' });
  }

  if (email === newEmail) {
    return json(400, { ok: false, message: 'Your new email is the same as your current email.' });
  }

  const verification = await verifySupabasePassword(email, password);
  if (verification.configurationError) {
    return json(500, { ok: false, message: 'Account updates are temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.' });
  }

  if (!verification.ok) {
    return json(401, { ok: false, message: 'That email and password did not match your member account.' });
  }

  const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
  const record = await findPurchasedRecordByEmail(email, fieldMap);

  if (!record || record.airtableError || record.configurationError) {
    return json(403, { ok: false, message: 'Your account was verified, but I could not find the matching purchase record to update.' });
  }

  try {
    await updateSupabaseEmail({ accessToken: verification.accessToken, newEmail });
    await updateAirtableEmail({ recordId: record.id, newEmail, fieldMap });
  } catch (error) {
    console.error(error.message || error);
    return json(500, { ok: false, message: 'Your email could not be updated yet. Please try again or email admin@theconfidentclinician.me.' });
  }

  return json(200, {
    ok: true,
    message: 'Your email has been updated. Use the new email the next time you log in.',
  });
};
