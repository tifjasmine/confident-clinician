const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const clean = (value) => String(value || '').trim();
const accessCodeMatches = (provided, expected) => Boolean(
  clean(expected) && clean(provided).toLowerCase() === clean(expected).toLowerCase()
);
const normalizeTitle = (value) => clean(value)
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/\bdo not\b/g, 'dont')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const escapeFormula = (value) => clean(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const airtableList = async ({ baseId, tableId, token, formula, maxRecords = 10 }) => {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', String(maxRecords));
  url.searchParams.set('filterByFormula', formula);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Airtable request failed with ${response.status}`);
  return response.json();
};

const verifySupabasePassword = async (email, password) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.ok;
};

const wistiaEmbed = async (url) => {
  const source = clean(url);
  const directMatch = source.match(/(?:\/medias\/|\/embed\/iframe\/)([a-z0-9]+)/i);
  if (directMatch) {
    return `https://fast.wistia.net/embed/iframe/${directMatch[1]}?videoFoam=true&playerColor=c56a4d&seo=false`;
  }

  if (/\.wistia\.com\/s\//i.test(source)) {
    const response = await fetch(`https://fast.wistia.com/oembed.json?url=${encodeURIComponent(source)}`);
    if (!response.ok) throw new Error(`Wistia share lookup failed with ${response.status}`);
    const metadata = await response.json();
    const embedMatch = clean(metadata.html).match(/https:\/\/fast\.wistia\.net\/embed\/iframe\/([a-z0-9]+)/i);
    if (embedMatch) {
      return `https://fast.wistia.net/embed/iframe/${embedMatch[1]}?videoFoam=true&playerColor=c56a4d&seo=false`;
    }
  }

  return source;
};

const trackView = async ({ baseId, token, email, workshop, resourceId }) => {
  const tableId = process.env.AIRTABLE_VIEWS_TABLE_ID || 'Workshop Views';
  const viewedAt = new Date().toISOString();
  const fullFields = {
    Name: `Workshop view | ${email} | ${resourceId} | ${viewedAt}`,
    'Viewed At': viewedAt,
    Notes: `Access opened for ${workshop}`,
    Workshop: workshop,
    'Resource ID': resourceId,
    'Participant Email': email,
  };
  const save = (fields) => fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  let response = await save(fullFields);
  if (!response.ok) {
    response = await save({ Name: fullFields.Name, 'Viewed At': viewedAt, Notes: fullFields.Notes });
  }
  if (!response.ok) console.error('Workshop view could not be tracked', response.status, await response.text());
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: 'Please try again.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const resourcesTable = process.env.AIRTABLE_RESOURCES_TABLE_ID || 'tbl44AA5SwkM8jxHI';
  const usersTable = process.env.AIRTABLE_PURCHASES_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const accessTable = process.env.AIRTABLE_WORKSHOP_ACCESS_TABLE_ID;
  const resourceId = clean(payload.resourceId);

  if (!token || !resourceId) {
    return json(500, { ok: false, message: 'Workshop access is temporarily unavailable.' });
  }

  try {
    const resources = await airtableList({
      baseId,
      tableId: resourcesTable,
      token,
      formula: `AND({Resource ID}='${escapeFormula(resourceId)}',{Published}=TRUE())`,
      maxRecords: 1,
    });
    const resource = resources.records?.[0];
    if (!resource) return json(404, { ok: false, message: 'That workshop resource is not available yet.' });

    const fields = resource.fields || {};
    const paid = Boolean(fields['Paid Access Required']);
    const email = normalizeEmail(payload.email);
    const password = clean(payload.password);
    let participantName = '';

    if (paid) {
      if (!email || !password) {
        return json(400, { ok: false, message: 'Enter your purchase email and password.' });
      }

      const workshop = clean(fields.Workshop);
      const purchases = await airtableList({
        baseId,
        tableId: usersTable,
        token,
        formula: `AND(LOWER({Email})='${escapeFormula(email)}',{Purchased}=TRUE())`,
        maxRecords: 50,
      });
      const workshopTitle = normalizeTitle(workshop);
      const purchaseMatch = purchases.records?.find((record) => {
        const itemTitle = normalizeTitle(record.fields?.Item);
        if (resourceId === 'what-to-say-video') return itemTitle.includes('what to say when you dont know what to say');
        return itemTitle === workshopTitle;
      });
      let ownsWorkshop = Boolean(purchaseMatch);
      participantName = clean(purchaseMatch?.fields?.Name);
      if (!ownsWorkshop && accessTable) {
        const registrations = await airtableList({
          baseId,
          tableId: accessTable,
          token,
          formula: `AND(LOWER({Email})='${escapeFormula(email)}',{Access Granted}=TRUE())`,
          maxRecords: 50,
        });
        const registrationMatch = registrations.records?.find((record) => (
          normalizeTitle(record.fields?.Workshop) === workshopTitle
        ));
        ownsWorkshop = Boolean(registrationMatch);
        participantName = clean(registrationMatch?.fields?.['Participant Name']);
      }
      if (!ownsWorkshop) {
        return json(403, { ok: false, message: 'I could not find workshop access for that email.' });
      }

      const accountPasswordMatches = await verifySupabasePassword(email, password);
      const workshopPassword = resourceId === 'what-to-say-video'
        ? process.env.WHAT_TO_SAY_ACCESS_PASSWORD
        : process.env.FIVE_SKILLS_ACCESS_PASSWORD;
      if (!accountPasswordMatches && !accessCodeMatches(password, workshopPassword)) {
        return json(401, { ok: false, message: 'That access code does not match. Please check your email and try again.' });
      }
    }

    await trackView({ baseId, token, email, workshop: fields.Workshop || fields.Title || 'Workshop', resourceId });

    return json(200, {
      ok: true,
      participantName,
      resource: {
        id: resourceId,
        title: fields.Title || fields.Workshop || 'Workshop',
        type: fields['Resource Type'] || 'Link',
        url: fields['Resource Type'] === 'Video' ? await wistiaEmbed(fields.URL) : fields.URL,
        downloadable: Boolean(fields.Downloadable),
      },
    });
  } catch (error) {
    console.error('Workshop resource access failed', error);
    return json(500, { ok: false, message: 'Workshop access could not be checked right now. Please try again.' });
  }
};
