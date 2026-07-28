const html = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  },
  body,
});

const redirect = (location) => ({
  statusCode: 303,
  headers: {
    Location: location,
    'Cache-Control': 'no-store',
  },
  body: '',
});

const getOrigin = (event) => {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  return `${proto}://${host}`;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return html(405, '<p>Method not allowed.</p>');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.CLINICAL_CONFIDENCE_LAB_STRIPE_PRICE_ID
    || 'price_1TyEZCASlf43jszV2eZ2kNon';

  if (!stripeSecretKey || !priceId) {
    return html(500, '<p>Checkout is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.</p>');
  }

  const origin = getOrigin(event);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('allow_promotion_codes', 'true');
  params.set('billing_address_collection', 'auto');
  params.set('success_url', `${origin}/clinical-confidence-lab?purchase=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/clinical-confidence-lab`);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const result = await response.json();

  if (!response.ok || !result.url) {
    console.error('Clinical Confidence Lab checkout session failed', {
      status: response.status,
      message: result?.error?.message,
      type: result?.error?.type,
    });
    return html(500, '<p>Checkout could not be opened. Please try again or email admin@theconfidentclinician.me.</p>');
  }

  return redirect(result.url);
};
