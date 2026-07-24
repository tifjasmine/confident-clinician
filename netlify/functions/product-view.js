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
  password: 'Password',
  purchased: 'Purchased',
  firstTime: 'First Time',
  welcomeEmailSent: 'Welcome Email Sent',
};

const defaultProductPasswords = {
  'Mini Playbook': 'MINIBOOK26',
  'Official Playbook': 'FULLCOVER26',
};

const defaultPaidProducts = ['Official Playbook'];

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

const parseListEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    const parsed = JSON.parse(process.env[name]);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch (error) {
    // Fall through to comma-separated values.
  }
  return process.env[name]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isChecked = (value) => value === true || value === 'true' || value === '1' || value === 1;

const escapeFormulaString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const supportMessage =
  'I could not check that email just now. Please try again, or email admin@theconfidentclinician.me and I will help.';

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

const getProductPasswords = () => {
  const configured = parseJsonEnv('RESOURCE_PRODUCT_PASSWORDS', defaultProductPasswords);
  return Object.entries(configured).reduce((acc, [key, value]) => {
    acc[normalizeProductName(key)] = value;
    return acc;
  }, {});
};

const getPaidProducts = () => Array.from(new Set([
  ...parseListEnv('RESOURCE_PAID_PRODUCTS', defaultPaidProducts).map(normalizeProductName),
  ...defaultPaidProducts.map(normalizeProductName),
]));

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
  const product = normalizeProductName(payload.product || 'Clinical Confidence Reset Guidebook');
  const notes = String(payload.notes || '').trim();

  if (!email || !email.includes('@')) {
    return json(400, { ok: false, message: 'Please enter a valid email.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const fieldMap = parseJsonEnv('AIRTABLE_PRODUCT_VIEW_FIELD_MAP', defaultFieldMap);
  const productPasswords = getProductPasswords();
  const productPassword = productPasswords[product] || '';
  const emailField = fieldMap.email || 'Email';
  const productField = fieldMap.product || 'Product';
  const purchasedField = fieldMap.purchased || 'Purchased';
  const paidProducts = getPaidProducts();
  const purchaseRequired = paidProducts.includes(product);
  const purchaseRequiredMessage =
    'I do not see a purchase connected to that email yet. Use the email from checkout, or purchase the playbook first. If this looks wrong, email admin@theconfidentclinician.me.';

  if (!token) {
    console.error('Product view missing Airtable token.');
    return json(500, {
      ok: false,
      message: supportMessage,
    });
  }

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', name);
  addIfConfigured(fields, fieldMap, 'email', email);
  addIfConfigured(fields, fieldMap, 'product', product);
  addIfConfigured(fields, fieldMap, 'opened', new Date().toISOString());
  addIfConfigured(fields, fieldMap, 'notes', notes);
  addIfConfigured(fields, fieldMap, 'password', productPassword);
  addIfConfigured(fields, fieldMap, 'firstTime', Boolean(productPassword));
  addIfConfigured(fields, fieldMap, 'welcomeEmailSent', false);

  try {
    if (productPassword) {
      const lookup = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
      lookup.searchParams.set('maxRecords', '10');
      lookup.searchParams.set('sort[0][field]', fieldMap.opened || 'Opened');
      lookup.searchParams.set('sort[0][direction]', 'desc');
      lookup.searchParams.set('filterByFormula', `AND(LOWER({${emailField}}) = '${escapeFormulaString(email)}', ${buildProductFormula(productField, product)})`);

      const existingResponse = await fetch(lookup, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!existingResponse.ok) {
        console.error('Product view Airtable lookup failed', existingResponse.status, await existingResponse.text());
        return json(500, {
          ok: false,
          message: supportMessage,
        });
      }

      const existing = await existingResponse.json();
      const records = existing.records || [];
      const purchasedRecord = records.find((record) => isChecked(record.fields?.[purchasedField]));
      if (purchaseRequired && !purchasedRecord) {
        return json(403, {
          ok: false,
          error: 'purchase_required',
          message: purchaseRequiredMessage,
        });
      }

      const existingRecord = purchaseRequired ? purchasedRecord : records[0];
      if (existingRecord) {
        const existingFields = existingRecord.fields || {};
        const existingName = String(existingFields[fieldMap.name || 'Name'] || '').trim();
        const purchased = isChecked(existingFields[purchasedField]);

        const patchFields = {};
        if (name && !existingName && fieldMap.name) {
          patchFields[fieldMap.name] = name;
        }
        if (productPassword && fieldMap.password && !existingFields[fieldMap.password]) {
          patchFields[fieldMap.password] = productPassword;
        }
        if (fieldMap.product && existingFields[fieldMap.product] !== product) {
          patchFields[fieldMap.product] = product;
        }
        if (fieldMap.firstTime && isChecked(existingFields[fieldMap.firstTime])) {
          patchFields[fieldMap.firstTime] = false;
        }
        if (fieldMap.welcomeEmailSent && !isChecked(existingFields[fieldMap.welcomeEmailSent])) {
          patchFields[fieldMap.welcomeEmailSent] = true;
        }

        if (Object.keys(patchFields).length > 0) {
          await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              records: [{ id: existingRecord.id, fields: patchFields }],
              typecast: true,
            }),
          });
        }

        return json(200, {
          ok: true,
          alreadyRequested: true,
          name: existingName || name,
          purchased,
        });
      }
    }

    if (purchaseRequired) {
      return json(403, {
        ok: false,
        error: 'purchase_required',
        message: purchaseRequiredMessage,
      });
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
      console.error('Product view Airtable save failed', response.status, message);
      return json(500, {
        ok: false,
        message: supportMessage,
      });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Product view failed', error);
    return json(500, {
      ok: false,
      message: supportMessage,
    });
  }
};
