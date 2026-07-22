const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const defaultFieldMap = {
  submission: 'Submission',
  name: 'Name',
  email: 'Email',
  workshop: 'Workshop',
  overallValue: 'Overall Value',
  stopPerformingClarity: 'Stop Performing Therapy Clarity',
  tolerateNotKnowingClarity: 'Tolerate Not Knowing Clarity',
  trustProcessClarity: 'Trust the Process Clarity',
  regulateYourselfClarity: 'Regulate Yourself First Clarity',
  buildSelfTrustClarity: 'Build Self-Trust Clarity',
  resonated: 'What Resonated',
  improve: 'What Could Be Better',
  recommendScore: 'Recommend Score',
  testimonialConsent: 'Testimonial Consent',
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

const cleanString = (value) => String(value || '').trim();
const cleanEmail = (value) => cleanString(value).toLowerCase();
const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const addIfPresent = (fields, fieldMap, key, value) => {
  const field = fieldMap[key];
  if (!field || value === undefined || value === null || value === '') return;
  fields[field] = value;
};

const buildNotes = (payload) => {
  const lines = [
    ['Workshop', cleanString(payload.workshop) || 'The 5 Skills That Separate New Therapists from Confident Clinicians'],
    ['Name', cleanString(payload.name)],
    ['Email', cleanEmail(payload.email)],
    ['Overall Value', cleanNumber(payload.overallValue)],
    ['Stop Performing Therapy Clarity', cleanNumber(payload.stopPerformingClarity)],
    ['Tolerate Not Knowing Clarity', cleanNumber(payload.tolerateNotKnowingClarity)],
    ['Trust the Process Clarity', cleanNumber(payload.trustProcessClarity)],
    ['Regulate Yourself First Clarity', cleanNumber(payload.regulateYourselfClarity)],
    ['Build Self-Trust Clarity', cleanNumber(payload.buildSelfTrustClarity)],
    ['Recommend Score', cleanNumber(payload.recommendScore)],
    ['Testimonial Consent', payload.testimonialConsent ? 'Yes' : 'No'],
    ['What Resonated', cleanString(payload.resonated)],
    ['What Could Be Better', cleanString(payload.improve)],
    ['Source URL', cleanString(payload.sourceUrl)],
    ['Submitted At', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })],
  ];

  return lines
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
};

const buildStructuredFields = (payload, fieldMap) => {
  const email = cleanEmail(payload.email);
  const name = cleanString(payload.name);
  const workshop = cleanString(payload.workshop) || 'The 5 Skills That Separate New Therapists from Confident Clinicians';
  const submittedAt = new Date().toISOString();
  const fields = {};

  addIfPresent(fields, fieldMap, 'submission', `${workshop} Feedback - ${name || email || submittedAt}`);
  addIfPresent(fields, fieldMap, 'name', name || email || 'Workshop Feedback');
  addIfPresent(fields, fieldMap, 'email', email);
  addIfPresent(fields, fieldMap, 'workshop', workshop);
  addIfPresent(fields, fieldMap, 'overallValue', cleanNumber(payload.overallValue));
  addIfPresent(fields, fieldMap, 'stopPerformingClarity', cleanNumber(payload.stopPerformingClarity));
  addIfPresent(fields, fieldMap, 'tolerateNotKnowingClarity', cleanNumber(payload.tolerateNotKnowingClarity));
  addIfPresent(fields, fieldMap, 'trustProcessClarity', cleanNumber(payload.trustProcessClarity));
  addIfPresent(fields, fieldMap, 'regulateYourselfClarity', cleanNumber(payload.regulateYourselfClarity));
  addIfPresent(fields, fieldMap, 'buildSelfTrustClarity', cleanNumber(payload.buildSelfTrustClarity));
  addIfPresent(fields, fieldMap, 'resonated', cleanString(payload.resonated));
  addIfPresent(fields, fieldMap, 'improve', cleanString(payload.improve));
  addIfPresent(fields, fieldMap, 'recommendScore', cleanNumber(payload.recommendScore));
  addIfPresent(fields, fieldMap, 'testimonialConsent', Boolean(payload.testimonialConsent));
  addIfPresent(fields, fieldMap, 'submittedAt', submittedAt);
  addIfPresent(fields, fieldMap, 'sourceUrl', cleanString(payload.sourceUrl));
  addIfPresent(fields, fieldMap, 'notes', buildNotes(payload));

  return fields;
};

const buildFallbackFields = (payload, fieldMap) => {
  const fields = {};
  const email = cleanEmail(payload.email);
  const name = cleanString(payload.name);
  addIfPresent(fields, fieldMap, 'name', name || email || 'Workshop Feedback');
  addIfPresent(fields, fieldMap, 'notes', buildNotes(payload));
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
  const tableId = process.env.AIRTABLE_FEEDBACK_TABLE_ID || 'tblL3eHxNfYVLbaf6';
  const fieldMap = parseJsonEnv('AIRTABLE_FEEDBACK_FIELD_MAP', defaultFieldMap);

  if (!token) {
    console.error('Workshop feedback missing Airtable token.');
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }

  try {
    const structuredFields = buildStructuredFields(payload, fieldMap);
    let response = await saveToAirtable(baseId, tableId, token, structuredFields);

    if (!response.ok) {
      const message = await response.text();
      console.error('Workshop feedback structured save failed', response.status, message);

      const fallbackFields = buildFallbackFields(payload, fieldMap);
      response = await saveToAirtable(baseId, tableId, token, fallbackFields);

      if (!response.ok) {
        const fallbackMessage = await response.text();
        console.error('Workshop feedback fallback save failed', response.status, fallbackMessage);
        return json(500, {
          ok: false,
          message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
        });
      }
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Workshop feedback failed', error);
    return json(500, {
      ok: false,
      message: 'Something did not send. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
