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
  source: 'Source',
  subscribedAt: 'Subscribed At',
};

const parseJsonEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env[name]) };
  } catch (error) {
    return fallback;
  }
};

const addIfConfigured = (fields, fieldMap, key, value) => {
  const airtableField = fieldMap[key];
  if (!airtableField || value === undefined || value === null || value === '') return;
  fields[airtableField] = value;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please enter a valid name and email.' });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const source = String(payload.source || 'Workshop page').trim();

  if (!email || !email.includes('@')) {
    return json(400, { ok: false, message: 'Please enter a valid email.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_SUBSCRIPTIONS_TABLE_ID || 'Subscriptions';
  const fieldMap = parseJsonEnv('AIRTABLE_SUBSCRIPTION_FIELD_MAP', defaultFieldMap);

  if (!token) {
    console.error('Workshop subscription missing Airtable token.');
    return json(500, { ok: false, message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.' });
  }

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', name || email);
  addIfConfigured(fields, fieldMap, 'email', email);
  addIfConfigured(fields, fieldMap, 'source', source || 'Workshop page');
  addIfConfigured(fields, fieldMap, 'subscribedAt', new Date().toISOString());

  try {
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
      console.error('Workshop subscription Airtable save failed', response.status, message);
      return json(500, { ok: false, message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.' });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Workshop subscription failed', error);
    return json(500, { ok: false, message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.' });
  }
};
