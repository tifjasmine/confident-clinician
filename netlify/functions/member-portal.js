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
  item: 'Item',
  purchased: 'Purchased',
  accountCreated: 'Account Created',
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

const findPurchasedRecordsByEmail = async (email, fieldMap) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const emailField = fieldMap.email || 'Email';
  const purchasedField = fieldMap.purchased || 'Purchased';

  if (!token) return { configurationError: 'AIRTABLE_ACCESS_TOKEN is missing.' };

  const formula = `AND(LOWER({${emailField}})='${airtableFormulaString(email)}',{${purchasedField}})`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '50');
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
  return result.records || [];
};

const normalizeTitle = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/\bdo not\b/g, 'dont')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const workshopForItem = (item, email) => {
  const normalized = normalizeTitle(item);
  if (normalized.includes('what to say when you dont know what to say')) {
    return {
      title: 'What to Say When You Don’t Know What to Say',
      meta: 'Purchased Workshop',
      description: 'Use PAUSE to slow the pressure, notice what is happening, and find a grounded response when the words do not come easily.',
      accessUrl: `/what-to-say-access.html?email=${encodeURIComponent(email)}`,
    };
  }
  if (normalized.includes('5 skills') || normalized.includes('five skills')) {
    return {
      title: 'The 5 Skills That Separate New Therapists from Confident Clinicians',
      meta: 'Purchased Workshop',
      description: 'A practical workshop on performing less, tolerating uncertainty, trusting the process, regulating yourself, and building self trust in the room.',
      accessUrl: `/five-skills-access.html?email=${encodeURIComponent(email)}`,
    };
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
    return json(500, {
      ok: false,
      message: 'Member access is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit your email and password again.' });
  }

  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    return json(400, { ok: false, message: 'Please enter your purchase email and workshop password.' });
  }

  const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
  const records = await findPurchasedRecordsByEmail(email, fieldMap);

  if (records && records.configurationError) {
    return json(500, {
      ok: false,
      message: 'Member access is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.',
    });
  }

  if (records && records.airtableError) {
    return json(500, {
      ok: false,
      message: 'Member access could not be checked right now. Please try again in a few minutes.',
    });
  }

  if (!records.length) {
    return json(403, {
      ok: false,
      message: 'I could not find a purchased workshop for that email yet. Try the checkout email, or give it a minute to sync.',
    });
  }

  const passwordMatchesWorkshop = password === accessPassword;
  const passwordMatchesAccount = await verifySupabasePassword(email, password);

  if (!passwordMatchesAccount && !passwordMatchesWorkshop) {
    return json(401, {
      ok: false,
      message: passwordMatchesAccount
        ? 'That password does not match your member account. Please try again.'
        : 'That password does not match. Use your member password, or the workshop password from your welcome email.',
    });
  }

  const workshops = records
    .map((record) => workshopForItem(record.fields?.[fieldMap.item || 'Item'], email))
    .filter(Boolean)
    .filter((workshop, index, all) => all.findIndex((entry) => entry.accessUrl === workshop.accessUrl) === index);

  if (!workshops.length) {
    return json(403, {
      ok: false,
      message: 'I found your purchase email, but no available workshop is connected to it yet. Please email admin@theconfidentclinician.me.',
    });
  }

  const record = records[0];
  return json(200, {
    ok: true,
    name: record.fields?.[fieldMap.name || 'Name'] || '',
    email,
    accountCreated: Boolean(record.fields?.[fieldMap.accountCreated || 'Account Created']),
    authType: passwordMatchesAccount ? 'member' : 'workshop',
    workshops,
  });
};
