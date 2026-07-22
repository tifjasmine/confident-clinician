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

const getPromoCodeId = async (stripeSecretKey, code) => {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return '';

  const fetchPromoCodes = async (query) => {
    const response = await fetch(`https://api.stripe.com/v1/promotion_codes?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Stripe promotion code lookup failed', {
        status: response.status,
        message: result?.error?.message,
        type: result?.error?.type,
      });
      return null;
    }

    return result;
  };

  const exactQuery = new URLSearchParams({
    code: cleanCode,
    active: 'true',
    limit: '1',
  });
  const exactResult = await fetchPromoCodes(exactQuery);
  if (exactResult?.data?.[0]?.id) return exactResult.data[0].id;

  let startingAfter = '';
  const lowerCode = cleanCode.toLowerCase();

  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({
      active: 'true',
      limit: '100',
    });
    if (startingAfter) query.set('starting_after', startingAfter);

    const result = await fetchPromoCodes(query);
    if (!result) return '';

    const match = result.data.find((promoCode) => String(promoCode.code || '').toLowerCase() === lowerCode);
    if (match?.id) return match.id;

    if (!result.has_more || !result.data.length) break;
    startingAfter = result.data[result.data.length - 1].id;
  }

  return '';
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return html(405, '<p>Method not allowed.</p>');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.FIVE_SKILLS_STRIPE_PRICE_ID;

  if (!stripeSecretKey || !priceId) {
    return html(500, '<p>Checkout is temporarily unavailable. Please try again later or email admin@theconfidentclinician.me.</p>');
  }

  const origin = getOrigin(event);
  const query = new URLSearchParams(event.rawQuery || '');
  const promo = query.get('promo') || query.get('discount') || '';
  const promotionCodeId = await getPromoCodeId(stripeSecretKey, promo);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  if (promotionCodeId) {
    params.set('discounts[0][promotion_code]', promotionCodeId);
  } else {
    params.set('allow_promotion_codes', 'true');
  }
  params.set('success_url', `${origin}/five-skills-access.html?purchase=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/workshop.html`);

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
    console.error('Stripe checkout session failed', result);
    return html(500, '<p>Checkout could not be opened. Please try again or email admin@theconfidentclinician.me.</p>');
  }

  return redirect(result.url);
};
