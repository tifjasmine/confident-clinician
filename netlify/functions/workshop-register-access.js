const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const clean = (value) => String(value || '').trim();
const email = (value) => clean(value).toLowerCase();
const FOCAL_POINT_WORKSHOP = 'Finding the Focal Point';

const getOrigin = (event) => {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${event.headers.host}`;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: 'Please enter your information again.' });
  }

  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
  const tableId = process.env.AIRTABLE_WORKSHOP_ACCESS_TABLE_ID;
  const participantEmail = email(payload.email);
  const participantName = clean(payload.name);
  const workshop = clean(payload.workshop);

  if (!token || !tableId) return json(500, { ok: false, message: 'Registration is temporarily unavailable.' });
  if (!participantEmail || !workshop) return json(400, { ok: false, message: 'Please enter your email.' });

  try {
    const registrationFields = {
      Registration: `${workshop} | ${participantEmail}`,
      'Participant Name': participantName,
      Email: participantEmail,
      Workshop: workshop,
      'Access Granted': true,
      'Registered At': new Date().toISOString(),
      'Source URL': clean(payload.sourceUrl),
    };

    const createResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ fields: registrationFields }],
        typecast: true,
      }),
    });
    if (!createResponse.ok) {
      const details = await createResponse.text();
      throw new Error(`Airtable create failed with ${createResponse.status}: ${details}`);
    }

    if (workshop === FOCAL_POINT_WORKSHOP) {
      const accessUrl = `${getOrigin(event)}/finding-focal-point-access.html?email=${encodeURIComponent(participantEmail)}`;
      return json(200, { ok: true, email: participantEmail, accessUrl });
    }

    return json(200, { ok: true, email: participantEmail });
  } catch (error) {
    console.error('Workshop access registration failed', error);
    return json(500, { ok: false, message: 'Your registration could not be saved. Please try again.' });
  }
};
