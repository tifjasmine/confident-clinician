const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

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
    return json(400, { ok: false, message: 'Please submit the form again.' });
  }

  const accessToken = String(payload.accessToken || '').trim();
  const password = String(payload.password || '').trim();

  if (!accessToken || !password) {
    return json(400, { ok: false, message: 'This reset link is missing information. Please request a new reset email.' });
  }

  if (password.length < 8) {
    return json(400, { ok: false, message: 'Please choose a password with at least 8 characters.' });
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    console.error('Supabase password update failed', await response.text());
    return json(400, {
      ok: false,
      message: 'That reset link may have expired. Please request a new one and try again.',
    });
  }

  return json(200, {
    ok: true,
    message: 'Your password has been updated. You can log in to the member portal now.',
  });
};
