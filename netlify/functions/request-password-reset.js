const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const siteOrigin = (event) => {
  if (process.env.PASSWORD_RESET_ORIGIN) return process.env.PASSWORD_RESET_ORIGIN.replace(/\/$/, '');
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.URL && process.env.URL.includes('theconfidentclinician.me')) return process.env.URL.replace(/\/$/, '');
  return 'https://theconfidentclinician.me';
};

const fallbackSiteOrigin = (event) => {
  if (process.env.URL) return process.env.URL.replace(/\/$/, '');
  const host = event.headers.host || event.headers.Host;
  return host ? `https://${host}` : '';
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return json(500, {
      ok: false,
      message: 'Password reset is temporarily unavailable. Please try again later.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit your email again.' });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return json(400, { ok: false, message: 'Please enter the email connected to your member account.' });
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      redirect_to: `${siteOrigin(event)}/reset-password.html`,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error('Supabase password recovery failed', message);

    if (fallbackSiteOrigin(event) && fallbackSiteOrigin(event) !== siteOrigin(event)) {
      const fallbackResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirect_to: `${fallbackSiteOrigin(event)}/reset-password.html`,
        }),
      });

      if (!fallbackResponse.ok) {
        console.error('Supabase password recovery fallback failed', await fallbackResponse.text());
      }
    }
  }

  return json(200, {
    ok: true,
    message: 'If a member account exists for that email, a reset link is on the way.',
  });
};
