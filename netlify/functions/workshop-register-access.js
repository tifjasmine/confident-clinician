const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const clean = (value) => String(value || '').trim();
const email = (value) => clean(value).toLowerCase();
const escapeFormula = (value) => clean(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
    const query = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    query.searchParams.set('maxRecords', '1');
    query.searchParams.set('filterByFormula', `AND(LOWER({Email})='${escapeFormula(participantEmail)}',{Workshop}='${escapeFormula(workshop)}')`);
    const existingResponse = await fetch(query, { headers: { Authorization: `Bearer ${token}` } });
    if (!existingResponse.ok) throw new Error(`Airtable lookup failed with ${existingResponse.status}`);
    const existing = await existingResponse.json();

    if (!existing.records?.length) {
      const createResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{
            fields: {
              Registration: `${workshop} | ${participantEmail}`,
              'Participant Name': participantName,
              Email: participantEmail,
              Workshop: workshop,
              'Access Granted': true,
              'Registered At': new Date().toISOString(),
              'Source URL': clean(payload.sourceUrl),
            },
          }],
          typecast: true,
        }),
      });
      if (!createResponse.ok) throw new Error(`Airtable create failed with ${createResponse.status}`);
    }

    return json(200, { ok: true, email: participantEmail });
  } catch (error) {
    console.error('Workshop access registration failed', error);
    return json(500, { ok: false, message: 'Your registration could not be saved. Please try again.' });
  }
};
