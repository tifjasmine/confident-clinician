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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const videoEmbedUrl = process.env.FIVE_SKILLS_VIDEO_EMBED_URL;
  const accessPassword = process.env.FIVE_SKILLS_ACCESS_PASSWORD;

  if (!videoEmbedUrl || !accessPassword) {
    return json(500, {
      ok: false,
      message: 'Workshop access is not fully configured yet. Please email admin@theconfidentclinician.me.',
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

  if (password !== accessPassword) {
    return json(401, { ok: false, message: 'That password does not match. Please check the workshop email and try again.' });
  }

  try {
    const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
    const record = await findPurchasedRecordByEmail(email, fieldMap);

    if (record && record.configurationError) {
      return json(500, {
        ok: false,
        message: 'Airtable is not connected yet. Please add AIRTABLE_ACCESS_TOKEN in Netlify environment variables.',
      });
    }

    if (record && record.airtableError) {
      return json(500, {
        ok: false,
        message: 'Airtable could not be checked. Confirm the token has access and the Email/Purchased fields are named correctly.',
      });
    }

    if (!record) {
      return json(403, {
        ok: false,
        message: 'I could not find a purchased workshop for that email yet. Try the checkout email, or give Stripe/Airtable a minute to sync.',
      });
    }

    return json(200, {
      ok: true,
      videoEmbedUrl,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: 'Something went wrong checking access. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
