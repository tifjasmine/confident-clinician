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
  firstTime: 'First Time',
  welcomeEmailSent: 'Welcome Email Sent',
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

const escapeFormulaString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const markMatchingWelcomeRequestsHandled = async ({ token, baseId, tableId, fieldMap, email, product }) => {
  const firstTimeField = fieldMap.firstTime;
  const welcomeEmailSentField = fieldMap.welcomeEmailSent;
  const emailField = fieldMap.email || 'Email';
  const productField = fieldMap.product || 'Product';

  if (!firstTimeField || !welcomeEmailSentField) return;

  const lookup = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
  lookup.searchParams.set('maxRecords', '10');
  lookup.searchParams.set(
    'filterByFormula',
    `AND(LOWER({${emailField}}) = '${escapeFormulaString(email)}', {${productField}} = '${escapeFormulaString(product)}', {${firstTimeField}} = TRUE(), NOT({${welcomeEmailSentField}}))`,
  );

  const response = await fetch(lookup, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Resource open Airtable request cleanup lookup failed', response.status, await response.text());
    return;
  }

  const data = await response.json();
  const records = (data.records || []).map((record) => ({
    id: record.id,
    fields: { [welcomeEmailSentField]: true },
  }));

  if (!records.length) return;

  const patchResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records, typecast: true }),
  });

  if (!patchResponse.ok) {
    console.error('Resource open Airtable request cleanup patch failed', patchResponse.status, await patchResponse.text());
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false });
  }

  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const product = String(payload.product || '').trim();
  const notes = String(payload.notes || 'Document opened.').trim();

  if (!email || !email.includes('@') || !product) {
    return json(400, { ok: false });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const fieldMap = parseJsonEnv('AIRTABLE_PRODUCT_VIEW_FIELD_MAP', defaultFieldMap);

  if (!token) {
    console.error('Resource open missing Airtable token.');
    return json(500, { ok: false });
  }

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', name);
  addIfConfigured(fields, fieldMap, 'email', email);
  addIfConfigured(fields, fieldMap, 'product', product);
  addIfConfigured(fields, fieldMap, 'opened', new Date().toISOString());
  addIfConfigured(fields, fieldMap, 'notes', notes);
  addIfConfigured(fields, fieldMap, 'firstTime', false);

  try {
    await markMatchingWelcomeRequestsHandled({ token, baseId, tableId, fieldMap, email, product });

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
      console.error('Resource open Airtable save failed', response.status, await response.text());
      return json(500, { ok: false });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Resource open failed', error);
    return json(500, { ok: false });
  }
};
