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
  product: 'Product',
  opened: 'Opened',
  notes: 'Notes',
};

const parseJsonEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env[name]) };
  } catch (error) {
    console.error(`Could not parse ${name}`, error);
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
    return json(400, { ok: false, message: 'Please enter your name and email.' });
  }

  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const product = String(payload.product || 'Clinical Confidence Reset Guidebook').trim();
  const notes = String(payload.notes || '').trim();

  if (!name) {
    return json(400, { ok: false, message: 'Please enter your name.' });
  }

  if (!email || !email.includes('@')) {
    return json(400, { ok: false, message: 'Please enter a valid email.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const fieldMap = parseJsonEnv('AIRTABLE_PRODUCT_VIEW_FIELD_MAP', defaultFieldMap);

  if (!token) {
    console.error('Product view missing Airtable token.');
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', name);
  addIfConfigured(fields, fieldMap, 'email', email);
  addIfConfigured(fields, fieldMap, 'product', product);
  addIfConfigured(fields, fieldMap, 'opened', new Date().toISOString());
  addIfConfigured(fields, fieldMap, 'notes', notes);

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
      console.error('Product view Airtable save failed', response.status, message);
      return json(500, {
        ok: false,
        message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
      });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Product view failed', error);
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
