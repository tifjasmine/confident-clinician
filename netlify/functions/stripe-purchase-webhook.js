const crypto = require('crypto');

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
  workshop: 'Workshop',
  amount: 'Amount',
  currency: 'Currency',
  paymentStatus: 'Payment Status',
  purchaseDate: 'Purchase Date',
  stripeSessionId: 'Stripe Session ID',
  stripePaymentIntent: 'Stripe Payment Intent',
  stripeCustomerId: 'Stripe Customer ID',
  coupon: 'Coupon',
  discount: 'Discount',
  accessPage: 'Access Page',
  purchased: 'Purchased',
};

const defaultProductViewFieldMap = {
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

const parseJsonEnv = (name, fallback) => {
  if (!process.env[name]) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env[name]) };
  } catch (error) {
    return fallback;
  }
};

const getResourceAccessByPrice = () => ({
  [process.env.OFFICIAL_PLAYBOOK_STRIPE_PRICE_ID || 'price_1TwA6QASlf43jszV4L67qeoU']: {
    product: 'Official Playbook',
    password: 'FULLCOVER26',
    accessPage: process.env.OFFICIAL_PLAYBOOK_ACCESS_PAGE_URL || 'https://theconfidentclinician.me/official-playbook',
  },
  ...parseJsonEnv('RESOURCE_ACCESS_BY_PRICE', {}),
});

const stripeRequest = async (path, secretKey) => {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe request failed: ${response.status} ${text}`);
  }

  return response.json();
};

const verifyStripeSignature = (rawBody, signatureHeader, webhookSecret) => {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch (error) {
    return false;
  }
};

const getStripeSignatureHeader = (headers = {}) => (
  headers['stripe-signature']
  || headers['Stripe-Signature']
  || headers['STRIPE-SIGNATURE']
);

const centsToDollars = (amount) => {
  if (typeof amount !== 'number') return null;
  return Number((amount / 100).toFixed(2));
};

const getDiscountDetails = (session) => {
  const discount = Array.isArray(session.discounts) && session.discounts.length > 0
    ? session.discounts[0]
    : null;

  const coupon = discount && discount.coupon ? discount.coupon : null;
  const couponName = coupon ? (coupon.name || coupon.id || '') : '';
  const amountOff = coupon && typeof coupon.amount_off === 'number' ? centsToDollars(coupon.amount_off) : '';
  const percentOff = coupon && typeof coupon.percent_off === 'number' ? `${coupon.percent_off}%` : '';

  return {
    coupon: couponName,
    discount: amountOff ? `$${amountOff}` : percentOff,
  };
};

const addIfConfigured = (fields, fieldMap, key, value) => {
  const airtableField = fieldMap[key];
  if (!airtableField || value === undefined || value === null || value === '') return;
  fields[airtableField] = value;
};

const getPurchasedResource = (lineItems) => {
  const accessByPrice = getResourceAccessByPrice();
  const items = Array.isArray(lineItems?.data) ? lineItems.data : [];

  for (const item of items) {
    const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
    if (priceId && accessByPrice[priceId]) return accessByPrice[priceId];
  }

  return null;
};

const buildAirtableFields = (session, lineItems, fieldMap) => {
  const customer = session.customer_details || {};
  const firstLineItem = lineItems && lineItems.data && lineItems.data.length > 0 ? lineItems.data[0] : null;
  const workshop = firstLineItem ? firstLineItem.description : 'The Confident Clinician Workshop';
  const amount = centsToDollars(session.amount_total);
  const { coupon, discount } = getDiscountDetails(session);
  const resourceAccess = getPurchasedResource(lineItems);
  const accessPage = resourceAccess?.accessPage || process.env.FIVE_SKILLS_ACCESS_PAGE_URL || 'https://theconfidentclinician.me/five-skills-access.html';

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', customer.name || session.customer_email || session.id);
  addIfConfigured(fields, fieldMap, 'email', customer.email || session.customer_email);
  addIfConfigured(fields, fieldMap, 'workshop', workshop);
  addIfConfigured(fields, fieldMap, 'amount', amount);
  addIfConfigured(fields, fieldMap, 'currency', String(session.currency || '').toUpperCase());
  addIfConfigured(fields, fieldMap, 'paymentStatus', session.payment_status);
  addIfConfigured(fields, fieldMap, 'purchaseDate', new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString());
  addIfConfigured(fields, fieldMap, 'stripeSessionId', session.id);
  addIfConfigured(fields, fieldMap, 'stripePaymentIntent', session.payment_intent);
  addIfConfigured(fields, fieldMap, 'stripeCustomerId', session.customer);
  addIfConfigured(fields, fieldMap, 'coupon', coupon);
  addIfConfigured(fields, fieldMap, 'discount', discount);
  addIfConfigured(fields, fieldMap, 'accessPage', accessPage);
  addIfConfigured(fields, fieldMap, 'purchased', true);
  return fields;
};

const createAirtableRecord = async (fields) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';

  if (!token) {
    throw new Error('AIRTABLE_ACCESS_TOKEN is missing.');
  }

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
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
    const text = await response.text();
    throw new Error(`Airtable create failed: ${response.status} ${text}`);
  }

  return response.json();
};

const updateAirtableRecord = async (recordId, fields) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';

  if (!token) {
    throw new Error('AIRTABLE_ACCESS_TOKEN is missing.');
  }

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields,
      typecast: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable update failed: ${response.status} ${text}`);
  }

  return response.json();
};

const airtableFormulaString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
    .map((alias) => `{${fieldName}}='${airtableFormulaString(alias)}'`);
  return clauses.length > 1 ? `OR(${clauses.join(',')})` : clauses[0];
};

const findExistingAirtableRecord = async (sessionId, fieldMap) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const sessionField = fieldMap.stripeSessionId;

  if (!token || !sessionField || !sessionId) return null;

  const formula = `{${sessionField}}='${airtableFormulaString(sessionId)}'`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('filterByFormula', formula);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const findAirtableRecordByEmail = async (email, fieldMap) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const emailField = fieldMap.email;

  if (!token || !emailField || !email) return null;

  const formula = `LOWER({${emailField}})='${airtableFormulaString(email)}'`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('filterByFormula', formula);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const findProductViewRecord = async (email, product, fieldMap) => {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const emailField = fieldMap.email || 'Email';
  const productField = fieldMap.product || 'Product';

  if (!token || !email || !product) return null;

  const formula = `AND(LOWER({${emailField}})='${airtableFormulaString(email)}', ${buildProductFormula(productField, product)})`;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('filterByFormula', formula);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error('Product access Airtable lookup failed', response.status, await response.text());
    return null;
  }

  const result = await response.json();
  return result.records && result.records.length > 0 ? result.records[0] : null;
};

const upsertProductViewAccess = async (session, lineItems, resourceAccess) => {
  if (!resourceAccess) return null;

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_PRODUCT_VIEWS_TABLE_ID || 'Product Views';
  const fieldMap = parseJsonEnv('AIRTABLE_PRODUCT_VIEW_FIELD_MAP', defaultProductViewFieldMap);
  const customer = session.customer_details || {};
  const email = String(customer.email || session.customer_email || '').trim().toLowerCase();
  const product = normalizeProductName(resourceAccess.product);

  if (!token || !email) return null;

  const fields = {};
  addIfConfigured(fields, fieldMap, 'name', customer.name || session.customer_email || session.id);
  addIfConfigured(fields, fieldMap, 'email', email);
  addIfConfigured(fields, fieldMap, 'product', product);
  addIfConfigured(fields, fieldMap, 'opened', new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString());
  addIfConfigured(fields, fieldMap, 'notes', 'Purchased through Stripe checkout.');
  addIfConfigured(fields, fieldMap, 'password', resourceAccess.password);
  addIfConfigured(fields, fieldMap, 'purchased', true);
  addIfConfigured(fields, fieldMap, 'firstTime', true);
  addIfConfigured(fields, fieldMap, 'welcomeEmailSent', false);

  const existingRecord = await findProductViewRecord(email, product, fieldMap);
  const targetUrl = existingRecord
    ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${existingRecord.id}`
    : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;

  const response = await fetch(targetUrl, {
    method: existingRecord ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(existingRecord ? { fields, typecast: true } : { records: [{ fields }], typecast: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Product view access save failed: ${response.status} ${text}`);
  }

  return response.json();
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  if (!verifyStripeSignature(rawBody, getStripeSignatureHeader(event.headers), webhookSecret)) {
    return json(400, { ok: false, message: 'Invalid Stripe signature.' });
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch (error) {
    return json(400, { ok: false, message: 'Invalid event payload.' });
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return json(200, { ok: true, ignored: true });
  }

  const session = stripeEvent.data && stripeEvent.data.object;
  if (!session || session.payment_status !== 'paid') {
    return json(200, { ok: true, ignored: true });
  }

  try {
    const lineItems = stripeSecretKey
      ? await stripeRequest(`/checkout/sessions/${session.id}/line_items?limit=100`, stripeSecretKey)
      : { data: [] };
    const fieldMap = parseJsonEnv('AIRTABLE_PURCHASE_FIELD_MAP', defaultFieldMap);
    const resourceAccess = getPurchasedResource(lineItems);
    const existingRecord = await findExistingAirtableRecord(session.id, fieldMap);

    if (existingRecord) {
      try {
        await upsertProductViewAccess(session, lineItems, resourceAccess);
      } catch (error) {
        console.error('Could not sync resource access for duplicate purchase', error);
      }
      return json(200, {
        ok: true,
        duplicate: true,
        recordId: existingRecord.id,
      });
    }

    const fields = buildAirtableFields(session, lineItems, fieldMap);
    const customer = session.customer_details || {};
    const email = String(customer.email || session.customer_email || '').trim().toLowerCase();
    const existingEmailRecord = await findAirtableRecordByEmail(email, fieldMap);

    if (existingEmailRecord) {
      const airtableRecord = await updateAirtableRecord(existingEmailRecord.id, fields);
      try {
        await upsertProductViewAccess(session, lineItems, resourceAccess);
      } catch (error) {
        console.error('Could not sync resource access', error);
      }

      return json(200, {
        ok: true,
        updated: true,
        recordId: airtableRecord.id,
      });
    }

    const airtableRecord = await createAirtableRecord(fields);
    try {
      await upsertProductViewAccess(session, lineItems, resourceAccess);
    } catch (error) {
      console.error('Could not sync resource access', error);
    }

    return json(200, {
      ok: true,
      recordId: airtableRecord.records && airtableRecord.records[0] ? airtableRecord.records[0].id : null,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: 'Could not save purchase to Airtable.',
    });
  }
};
