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
  instagram: 'Instagram Handle',
  pathway: 'Pathway',
  stage: 'Stage',
  currentRole: 'Current Role',
  challenges: 'Challenges',
  selfDoubtTiming: 'Self-Doubt Timing',
  supportWanted: 'Support Wanted',
  currentFocus: 'Current Focus',
  interestedIn: 'Interested In',
  workDescription: 'Work Description',
  stateServed: 'State Served / Telehealth',
  confidenceWish: 'Confidence Wish',
  resourceUpdates: 'Resource Updates',
  submittedAt: 'Submitted At',
  sourceUrl: 'Source URL',
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

const addIfPresent = (fields, fieldMap, key, value) => {
  const field = fieldMap[key];
  const cleanValue = typeof value === 'string' ? value.trim() : value;
  if (!field || cleanValue === undefined || cleanValue === null || cleanValue === '') return;
  fields[field] = cleanValue;
};

const formatValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value.trim();
  return value || '';
};

const buildNotes = (payload) => {
  const lines = [
    ['Pathway', payload.pathway],
    ['Name', payload.name],
    ['Email', String(payload.email || '').trim().toLowerCase()],
    ['Instagram', payload.instagram],
    ['Stage', payload.stage],
    ['Current Role', payload.currentRole],
    ['Challenges', payload.challenges],
    ['Self-Doubt Timing', payload.selfDoubtTiming],
    ['Support Wanted', payload.supportWanted],
    ['Current Focus', payload.currentFocus],
    ['Interested In', payload.interest || payload.interestedIn],
    ['Work Description', payload.workDescription],
    ['State Served / Telehealth', payload.stateServed],
    ['Confidence Wish', payload.confidenceWish || payload.wish],
    ['Resource Updates', payload.resourceUpdates],
    ['Source URL', payload.sourceUrl],
    ['Submitted At', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })],
  ]
    .map(([label, value]) => [label, formatValue(value)])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  if (payload.notes) lines.push('', formatValue(payload.notes));

  return lines.join('\n');
};

const buildFallbackFields = (payload, fieldMap) => {
  const fields = {};
  const email = String(payload.email || '').trim().toLowerCase();
  const pathway = formatValue(payload.pathway);
  const fallbackName = [payload.name, payload.instagram, email, pathway && `${pathway} Response`]
    .map(formatValue)
    .find(Boolean);

  addIfPresent(
    fields,
    fieldMap,
    'name',
    fallbackName || 'Instagram Response',
  );
  addIfPresent(fields, fieldMap, 'notes', buildNotes(payload));
  return fields;
};

const buildStructuredFields = (payload, fieldMap) => {
  const fields = buildFallbackFields(payload, fieldMap);
  addIfPresent(fields, fieldMap, 'email', String(payload.email || '').trim().toLowerCase());
  addIfPresent(fields, fieldMap, 'instagram', payload.instagram);
  addIfPresent(fields, fieldMap, 'pathway', payload.pathway);
  addIfPresent(fields, fieldMap, 'stage', payload.stage);
  addIfPresent(fields, fieldMap, 'currentRole', payload.currentRole);
  addIfPresent(fields, fieldMap, 'challenges', payload.challenges);
  addIfPresent(fields, fieldMap, 'selfDoubtTiming', payload.selfDoubtTiming);
  addIfPresent(fields, fieldMap, 'supportWanted', payload.supportWanted);
  addIfPresent(fields, fieldMap, 'currentFocus', payload.currentFocus);
  addIfPresent(fields, fieldMap, 'interestedIn', payload.interest || payload.interestedIn);
  addIfPresent(fields, fieldMap, 'workDescription', payload.workDescription);
  addIfPresent(fields, fieldMap, 'stateServed', payload.stateServed);
  addIfPresent(fields, fieldMap, 'confidenceWish', payload.confidenceWish || payload.wish);
  addIfPresent(fields, fieldMap, 'resourceUpdates', payload.resourceUpdates);
  addIfPresent(fields, fieldMap, 'submittedAt', new Date().toISOString());
  addIfPresent(fields, fieldMap, 'sourceUrl', payload.sourceUrl);
  return fields;
};

const saveToAirtable = (baseId, tableId, token, fields) =>
  fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please try again.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_INSTAGRAM_TABLE_ID || 'Instagram';
  const fieldMap = parseJsonEnv('AIRTABLE_INSTAGRAM_FIELD_MAP', defaultFieldMap);

  if (!token) {
    console.error('Instagram path missing Airtable token.');
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }

  try {
    const fallbackFields = buildFallbackFields(payload, fieldMap);
    const structuredFields = buildStructuredFields(payload, fieldMap);
    let response = await saveToAirtable(baseId, tableId, token, structuredFields);

    if (!response.ok) {
      const message = await response.text();
      console.error('Instagram path Airtable save failed', response.status, message);

      response = await saveToAirtable(baseId, tableId, token, fallbackFields);

      if (!response.ok) {
        const fallbackMessage = await response.text();
        console.error('Instagram path Airtable fallback save failed', response.status, fallbackMessage);
        return json(500, {
          ok: false,
          message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
        });
      }
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Instagram path failed', error);
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
