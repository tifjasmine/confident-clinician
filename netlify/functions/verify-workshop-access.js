const stripeBaseUrl = 'https://api.stripe.com/v1';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const stripeRequest = async (path, secretKey) => {
  const response = await fetch(`${stripeBaseUrl}${path}`, {
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

const sessionMatchesWorkshop = async (session, secretKey, expectedPriceId, expectedPaymentLinkId) => {
  if (expectedPaymentLinkId && session.payment_link !== expectedPaymentLinkId) {
    return false;
  }

  if (!expectedPriceId) {
    return true;
  }

  const lineItems = await stripeRequest(`/checkout/sessions/${session.id}/line_items?limit=100`, secretKey);
  return (lineItems.data || []).some((item) => item.price && item.price.id === expectedPriceId);
};

const hasPaidForWorkshop = async (email, secretKey, expectedPriceId, expectedPaymentLinkId) => {
  let startingAfter = '';
  let checked = 0;
  const maxSessionsToScan = 500;

  while (checked < maxSessionsToScan) {
    const path = `/checkout/sessions?limit=100${startingAfter ? `&starting_after=${encodeURIComponent(startingAfter)}` : ''}`;
    const sessions = await stripeRequest(path, secretKey);
    const data = sessions.data || [];

    for (const session of data) {
      checked += 1;
      const sessionEmail = normalizeEmail(
        session.customer_details && session.customer_details.email
          ? session.customer_details.email
          : session.customer_email
      );

      if (session.payment_status === 'paid' && sessionEmail === email) {
        const matchesWorkshop = await sessionMatchesWorkshop(
          session,
          secretKey,
          expectedPriceId,
          expectedPaymentLinkId
        );

        if (matchesWorkshop) {
          return true;
        }
      }
    }

    if (!sessions.has_more || data.length === 0) {
      return false;
    }

    startingAfter = data[data.length - 1].id;
  }

  return false;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const accessPassword = process.env.FIVE_SKILLS_ACCESS_PASSWORD;
  const videoEmbedUrl = process.env.FIVE_SKILLS_VIDEO_EMBED_URL;
  const expectedPriceId = process.env.FIVE_SKILLS_STRIPE_PRICE_ID || '';
  const expectedPaymentLinkId = process.env.FIVE_SKILLS_STRIPE_PAYMENT_LINK_ID || '';

  if (!secretKey || !accessPassword || !videoEmbedUrl) {
    return json(500, {
      ok: false,
      message: 'Workshop access is not configured yet. Please email admin@theconfidentclinician.me.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, message: 'Please submit your email and password again.' });
  }

  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    return json(400, { ok: false, message: 'Please enter the email you used at checkout and the workshop password.' });
  }

  if (password !== accessPassword) {
    return json(401, { ok: false, message: 'That password does not match. Please check the workshop email and try again.' });
  }

  try {
    const paid = await hasPaidForWorkshop(email, secretKey, expectedPriceId, expectedPaymentLinkId);

    if (!paid) {
      return json(403, {
        ok: false,
        message: 'I could not find a paid workshop purchase for that email. Try the email used at checkout or email admin@theconfidentclinician.me.',
      });
    }

    return json(200, {
      ok: true,
      videoEmbedUrl,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: 'Something went wrong checking access. Please try again or email admin@theconfidentclinician.me.',
    });
  }
};
