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

const defaultViewFieldMap = {
  name: 'Name',
  student: 'Student',
  viewedAt: 'Viewed At',
  notes: 'Notes',
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
const fiveSkillsWistiaUrl = 'https://fast.wistia.net/embed/iframe/ujh4iffsoi';

const getVideoEmbedUrl = () => {
  const configuredUrl = String(process.env.FIVE_SKILLS_VIDEO_EMBED_URL || '').trim();
  if (!configuredUrl || /youtu\.?be|youtube/i.test(configuredUrl)) {
    return fiveSkillsWistiaUrl;
  }
  return configuredUrl;
};

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

  if (!response.ok) {
    return { airtableError: response.status };
  }

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
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

const logWorkshopView = async ({ email, purchaseRecord, fieldMap }) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_VIEWS_TABLE_ID || 'Views';

  if (!token || !purchaseRecord) return;

  const viewedAt = new Date().toISOString();
  const fields = {
    [fieldMap.name || 'Name']: `Workshop view - ${email}`,
    [fieldMap.viewedAt || 'Viewed At']: viewedAt,
  };

  if (fieldMap.student) {
    fields[fieldMap.student] = [purchaseRecord.id];
  }

  if (fieldMap.notes) {
    fields[fieldMap.notes] = 'Access opened for The 5 Skills workshop.';
  }

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
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

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Airtable view logging failed: ${response.status} ${message}`);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const videoEmbedUrl = getVideoEmbedUrl();
  const accessPassword = process.env.FIVE_SKILLS_ACCESS_PASSWORD;

  if (!videoEmbedUrl || !accessPassword) {
    return json(500, {
      ok: false,
      message: 'Workshop access is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.',
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
    return json(400, { ok: false, message: 'Please enter the email you used at checkout and the workshop password.' });
  }

  const passwordMatchesWorkshop = password === accessPassword;
  const passwordMatchesAccount = passwordMatchesWorkshop ? false : await verifySupabasePassword(email, password);

  if (!passwordMatchesWorkshop && !passwordMatchesAccount) {
    return json(401, { ok: false, message: 'That password does not match. Use your member password, or the workshop password from your welcome email.' });
  }

  try {
    const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
    const record = await findPurchasedRecordByEmail(email, fieldMap);

    if (record && record.configurationError) {
      return json(500, {
        ok: false,
        message: 'Workshop access is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.',
      });
    }

    if (record && record.airtableError) {
      return json(500, {
        ok: false,
        message: 'Workshop access could not be checked right now. Please try again in a few minutes.',
      });
    }

    if (!record) {
      return json(403, {
        ok: false,
        message: 'I could not find a purchased workshop for that email yet. Try the checkout email, or give it a minute to sync.',
      });
    }

    try {
      const viewFieldMap = parseJsonEnv('AIRTABLE_VIEW_FIELD_MAP', defaultViewFieldMap);
      await logWorkshopView({ email, purchaseRecord: record, fieldMap: viewFieldMap });
    } catch (viewError) {
      console.warn(viewError.message || viewError);
    }

    return json(200, {
      ok: true,
      videoEmbedUrl,
      authType: passwordMatchesAccount ? 'member' : 'workshop',
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: 'Something went wrong checking access. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
