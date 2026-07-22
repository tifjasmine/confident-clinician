const { execFileSync } = require('child_process');

const cwd = process.cwd();
const baseId = process.env.AIRTABLE_PURCHASES_BASE_ID || 'appPQAC82txeqHx9R';
const tableName = process.env.AIRTABLE_INSTAGRAM_TABLE_ID || 'Instagram';

const getNetlifyEnv = (name) => {
  try {
    return execFileSync('npx', ['netlify', 'env:get', name, '--context', 'production', '--plain'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    return '';
  }
};

const token = process.env.AIRTABLE_ACCESS_TOKEN || getNetlifyEnv('AIRTABLE_ACCESS_TOKEN');

if (!token) {
  console.error('Could not find AIRTABLE_ACCESS_TOKEN in the local or Netlify environment.');
  process.exit(1);
}

const choices = (names) => ({ choices: names.map((name) => ({ name })) });

const fieldsToCreate = [
  { name: 'Email', type: 'email' },
  { name: 'Instagram Handle', type: 'singleLineText' },
  {
    name: 'Pathway',
    type: 'singleSelect',
    options: choices(['Developing Clinician', 'Established Clinician']),
  },
  {
    name: 'Stage',
    type: 'singleSelect',
    options: choices([
      'Graduate student or intern',
      'Pre-licensed clinician',
      'Licensed for under two years',
      'Licensed for two to five years',
      'Experienced, but still struggling with confidence',
    ]),
  },
  {
    name: 'Current Role',
    type: 'multipleSelects',
    options: choices([
      'Licensed therapist in private practice',
      'Group practice clinician',
      'Group practice owner',
      'Supervisor',
      'Agency or community-based clinician',
      'Coach, educator, or wellness professional',
      'Other',
    ]),
  },
  {
    name: 'Challenges',
    type: 'multipleSelects',
    options: choices([
      'I overthink what to say',
      'I talk too much or overexplain',
      'I freeze when clients shut down',
      'I rely too heavily on worksheets',
      'I struggle to structure sessions',
      'I question myself after sessions',
      'I have trouble with boundaries',
      'I feel like I should be further along',
      'I feel burned out or emotionally drained',
      'Other',
    ]),
  },
  {
    name: 'Self-Doubt Timing',
    type: 'multipleSelects',
    options: choices([
      'Before sessions',
      'During difficult moments',
      'After sessions',
      'When clients are quiet',
      'When clients are not progressing',
      'When I compare myself to other therapists',
      'When I receive feedback',
      'Honestly, all the time',
    ]),
  },
  {
    name: 'Support Wanted',
    type: 'multipleSelects',
    options: choices([
      'A short, affordable workshop',
      'A practical skills intensive',
      'A structured multi-week program',
      'Live practice and feedback',
      'Templates, scripts, and tools',
      'A supportive clinician community',
      'I am not sure yet',
    ]),
  },
  {
    name: 'Current Focus',
    type: 'multipleSelects',
    options: choices([
      'Growing or refining my private practice',
      'Strengthening my clinical skills',
      'Supporting newer clinicians',
      'Preventing burnout',
      'Creating trainings or workshops',
      'Building professional connections',
      'Finding referral partners',
      'Developing a specialty',
      'Other',
    ]),
  },
  {
    name: 'Interested In',
    type: 'multipleSelects',
    options: choices([
      'Advanced clinician workshops',
      'Collaboration opportunities',
      'Referral connections',
      'Supervisor resources',
      'Guest teaching or speaking',
      'The Confident Clinician program',
      'Resources for clinicians I supervise',
      'Other',
    ]),
  },
  { name: 'Work Description', type: 'multilineText' },
  { name: 'State Served / Telehealth', type: 'multilineText' },
  { name: 'Confidence Wish', type: 'multilineText' },
  {
    name: 'Submitted At',
    type: 'dateTime',
    options: {
      dateFormat: { name: 'iso' },
      timeFormat: { name: '24hour' },
      timeZone: 'America/New_York',
    },
  },
  { name: 'Source URL', type: 'url' },
];

const airtableFetch = async (path, options = {}) => {
  const response = await fetch(`https://api.airtable.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (error) {
    body = { raw: text };
  }
  if (!response.ok) {
    const detail = body?.error?.message || body?.error?.type || text || response.statusText;
    throw new Error(`${response.status} ${detail}`);
  }
  return body;
};

(async () => {
  console.log(`Looking for table "${tableName}" in base ${baseId}...`);
  const schema = await airtableFetch(`/v0/meta/bases/${baseId}/tables`);
  const table = schema.tables.find((item) => item.name === tableName || item.id === tableName);

  if (!table) {
    const names = schema.tables.map((item) => `${item.name} (${item.id})`).join(', ');
    throw new Error(`Could not find table "${tableName}". Available tables: ${names}`);
  }

  const existing = new Set(table.fields.map((field) => field.name));
  const created = [];
  const skipped = [];

  for (const field of fieldsToCreate) {
    if (existing.has(field.name)) {
      skipped.push(field.name);
      continue;
    }

    await airtableFetch(`/v0/meta/bases/${baseId}/tables/${table.id}/fields`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
    created.push(field.name);
    console.log(`Created: ${field.name}`);
  }

  console.log('');
  console.log(`Done. Created ${created.length} field(s). Skipped ${skipped.length} existing field(s).`);
  if (skipped.length) console.log(`Already existed: ${skipped.join(', ')}`);
})().catch((error) => {
  console.error(`Could not update Airtable fields: ${error.message}`);
  process.exit(1);
});
