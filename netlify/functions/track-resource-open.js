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

const productAliasGroups = {
  'Mini Playbook': [
    'Mini Playbook',
    'The Confident Clinician Mini Playbook',
    'Brand Playbook',
    'Clinical Confidence Mini Playbook',
  ],
  'Official Playbook': [
    'Official Playbook',
    'The Confident Clinician Official Playbook',
    'Confident Clinician Playbook',
    'The Confident Clinician Playbook',
  ],
};

const productAliasLookup = Object.entries(productAliasGroups).reduce((lookup, [canonical, aliases]) => {
  aliases.forEach((alias) => {
    lookup[String(alias).trim().toLowerCase()] = canonical;
  });
  return lookup;
}, {});

const normalizeProductName = (value = '') => {
  const raw = String(value || '').trim();
  return productAliasLookup[raw.toLowerCase()] || raw;
};

const getProductAliases = (product) => {
  const canonical = normalizeProductName(product);
  return productAliasGroups[canonical] || [canonical];
};

const buildProductFormula = (fieldName, product) => {
  const clauses = getProductAliases(product)
    .filter(Boolean)
    .map((alias) => `{${fieldName}} = '${escapeFormulaString(alias)}'`);
  return clauses.length > 1 ? `OR(${clauses.join(', ')})` : clauses[0];
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
  const product = normalizeProductName(payload.product || '');
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

  try {
    const emailField = fieldMap.email || 'Email';
    const productField = fieldMap.product || 'Product';
    const openedField = fieldMap.opened || 'Opened';
    const lookup = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
    lookup.searchParams.set('maxRecords', '1');
    lookup.searchParams.set('sort[0][field]', openedField);
    lookup.searchParams.set('sort[0][direction]', 'desc');
    lookup.searchParams.set(
      'filterByFormula',
      `AND(LOWER({${emailField}}) = '${escapeFormulaString(email)}', ${buildProductFormula(productField, product)})`,
    );

    const lookupResponse = await fetch(lookup, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!lookupResponse.ok) {
      console.error('Resource open Airtable lookup failed', lookupResponse.status, await lookupResponse.text());
      return json(500, { ok: false });
    }

    const existing = await lookupResponse.json();
    const existingRecord = existing.records?.[0];
    if (!existingRecord) {
      // Access requests create the canonical row before the resource can be opened.
      // Do not create an open-only row because Airtable welcome automations may
      // interpret any newly created Product Views row as a new subscriber.
      return json(200, { ok: true, tracked: false });
    }

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ id: existingRecord.id, fields }],
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
