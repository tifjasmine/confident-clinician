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
  product: 'Product',
  password: 'Password',
  purchased: 'Purchased',
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

const parseListEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    const parsed = JSON.parse(process.env[name]);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch (error) {
    // Fall through to comma-separated values.
  }
  return process.env[name].split(',').map((item) => item.trim()).filter(Boolean);
};

const isChecked = (value) => value === true || value === 'true' || value === '1' || value === 1;

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
    return json(400, { ok: false, message: 'Please enter your email and password.' });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();
  const product = normalizeProductName(payload.product || '');

  if (!email || !email.includes('@') || !password || !product) {
    return json(400, { ok: false, message: 'Please enter the email you used and the password from your email.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const fieldMap = parseJsonEnv('AIRTABLE_PRODUCT_VIEW_FIELD_MAP', defaultFieldMap);
  const emailField = fieldMap.email || 'Email';
  const productField = fieldMap.product || 'Product';
  const passwordField = fieldMap.password || 'Password';
  const purchasedField = fieldMap.purchased || 'Purchased';
  const paidProducts = getPaidProducts();
  const purchaseRequired = paidProducts.includes(product);

  if (!token) {
    console.error('Resource access missing Airtable token.');
    return json(500, {
      ok: false,
      message: 'Access could not be checked. Please try again or email admin@theconfidentclinician.me.',
    });
  }

  const formula = `AND(LOWER({${emailField}}) = '${escapeFormulaString(email)}', ${buildProductFormula(productField, product)}, {${passwordField}} = '${escapeFormulaString(password)}')`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
  url.searchParams.set('maxRecords', '10');
  url.searchParams.set('sort[0][field]', fieldMap.opened || 'Opened');
  url.searchParams.set('sort[0][direction]', 'desc');
  url.searchParams.set('filterByFormula', formula);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Resource access Airtable lookup failed', response.status, await response.text());
      return json(500, {
        ok: false,
        message: 'Access could not be checked. Please try again or email admin@theconfidentclinician.me.',
      });
    }

    const data = await response.json();
    const records = data.records || [];
    const record = purchaseRequired
      ? records.find((candidate) => isChecked(candidate.fields?.[purchasedField]))
      : records[0];

    if (!record) {
      if (purchaseRequired && records.length > 0) {
        return json(403, {
          ok: false,
          message: 'That email is not showing an active purchase yet. Use the email from checkout, or email admin@theconfidentclinician.me if you need help.',
        });
      }

      return json(401, {
        ok: false,
        message: 'That email and password did not match. Check your email and try again, or use a different email.',
      });
    }

    if (purchaseRequired && !isChecked(record.fields?.[purchasedField])) {
      return json(403, {
        ok: false,
        message: 'That email is not showing an active purchase yet. Use the email from checkout, or email admin@theconfidentclinician.me if you need help.',
      });
    }

    return json(200, {
      ok: true,
      name: String(record.fields?.Name || '').trim(),
      email,
      product,
      purchased: purchaseRequired ? true : isChecked(record.fields?.[purchasedField]),
    });
  } catch (error) {
    console.error('Resource access failed', error);
    return json(500, {
      ok: false,
      message: 'Access could not be checked. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
