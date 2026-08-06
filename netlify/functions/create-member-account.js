const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const defaultFieldMap = {
  name: 'Name',
  email: 'Email',
  purchased: 'Purchased',
  accountCreated: 'Account Created',
  accountCreatedAt: 'Account Created At',
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
const accessCodeMatches = (provided, expected) => Boolean(
  String(expected || '').trim()
  && String(provided || '').trim().toLowerCase() === String(expected || '').trim().toLowerCase()
);

const airtableFormulaString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const findWorkshopAccessByEmail = async (email) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_WORKSHOP_ACCESS_TABLE_ID;
  if (!token || !tableId) return null;

  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('filterByFormula', `AND(LOWER({Email})='${airtableFormulaString(email)}',{Access Granted}=TRUE())`);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return { airtableError: response.status };
  const result = await response.json();
  return result.records?.[0] || null;
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { airtableError: response.status };
  }

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const updateAirtableRecord = async (recordId, fields) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields, typecast: true }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Airtable account update failed: ${response.status} ${message}`);
  }
};

const createSupabaseUser = async ({ email, password, name }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      configurationError: 'Member account setup is temporarily unavailable.',
    };
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || '',
        source: 'the_confident_clinician',
      },
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = String(result.msg || result.message || '').toLowerCase();
    if (response.status === 422 && (message.includes('already') || message.includes('registered'))) {
      return { ok: true, alreadyExists: true };
    }

    return {
      supabaseError: result.msg || result.message || `Supabase returned ${response.status}.`,
    };
  }

  return { ok: true, user: result };
};

const tagPlatformProfile = async ({ userId, email, name }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return;

  const fields = {
    email,
    platform: 'confident_clinician',
    display_name: name || null,
    source: 'member_account_creation',
  };

  if (userId) fields.user_id = userId;

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/platform_profiles?on_conflict=platform,email`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    console.error('Platform profile tag failed', response.status, await response.text());
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const workshopPasswords = [
    process.env.FIVE_SKILLS_ACCESS_PASSWORD,
    process.env.WHAT_TO_SAY_ACCESS_PASSWORD,
  ].filter(Boolean);
  if (!workshopPasswords.length) {
    return json(500, { ok: false, message: 'Member account setup is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit the form again.' });
  }

  const email = normalizeEmail(payload.email);
  const accessPassword = String(payload.accessPassword || '').trim();
  const accountPassword = String(payload.accountPassword || '').trim();

  if (!email || !accessPassword || !accountPassword) {
    return json(400, { ok: false, message: 'Please enter your purchase email, workshop password, and new account password.' });
  }

  if (accountPassword.length < 8) {
    return json(400, { ok: false, message: 'Please choose an account password with at least 8 characters.' });
  }

  if (!workshopPasswords.some((expected) => accessCodeMatches(accessPassword, expected))) {
    return json(401, { ok: false, message: 'That workshop password does not match. Please check your welcome email and try again.' });
  }

  const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
  let record = await findPurchasedRecordByEmail(email, fieldMap);
  let recordSource = 'purchase';

  if (record && record.configurationError) {
    return json(500, { ok: false, message: 'Member account setup is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.' });
  }

  if (record && record.airtableError) {
    return json(500, { ok: false, message: 'Member account setup could not be checked right now. Please try again in a few minutes.' });
  }

  if (!record) {
    record = await findWorkshopAccessByEmail(email);
    recordSource = 'registration';
  }

  if (record && record.airtableError) {
    return json(500, { ok: false, message: 'Member account setup could not be checked right now. Please try again in a few minutes.' });
  }

  if (!record) {
    return json(403, { ok: false, message: 'I could not find workshop access for that email yet.' });
  }

  const displayName = recordSource === 'purchase'
    ? record.fields?.[fieldMap.name || 'Name'] || ''
    : record.fields?.['Participant Name'] || '';
  const supabaseResult = await createSupabaseUser({
    email,
    password: accountPassword,
    name: displayName,
  });

  if (supabaseResult.configurationError) {
    return json(500, {
      ok: false,
      message: 'Member account setup is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.',
    });
  }

  if (supabaseResult.supabaseError) {
    return json(500, {
      ok: false,
      message: 'Your member account could not be created yet. Please try again or email admin@theconfidentclinician.me.',
    });
  }

  await tagPlatformProfile({
    userId: supabaseResult.user?.id || null,
    email,
    name: displayName,
  });

  if (recordSource === 'purchase') {
    const fields = {
      [fieldMap.accountCreated || 'Account Created']: true,
      [fieldMap.accountCreatedAt || 'Account Created At']: new Date().toISOString(),
    };

    try {
      await updateAirtableRecord(record.id, fields);
    } catch (error) {
      console.error(error.message || error);
      return json(200, {
        ok: true,
        warning: true,
        message: 'Your member account is ready. You can log in to the portal now.',
      });
    }
  }

  return json(200, {
    ok: true,
    message: 'Your member account is ready.',
  });
};
