const PROMOTION_CODE_ID = 'promo_1U0nV2ASlf43jszVXnO8UYVC';
const EXPIRES_AT = Date.parse('2027-01-02T05:00:00Z');

exports.handler = async () => {
  if (Date.now() < EXPIRES_AT) {
    return { statusCode: 200, body: 'LABLAUNCH100 is still active.' };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('LABLAUNCH100 expiration skipped because STRIPE_SECRET_KEY is missing.');
    return { statusCode: 500, body: 'Stripe configuration is missing.' };
  }

  const response = await fetch(`https://api.stripe.com/v1/promotion_codes/${PROMOTION_CODE_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ active: 'false' }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error('LABLAUNCH100 could not be deactivated.', {
      status: response.status,
      message: result?.error?.message,
    });
    return { statusCode: 500, body: 'Promotion code expiration failed.' };
  }

  return { statusCode: 200, body: 'LABLAUNCH100 is inactive.' };
};

exports.config = {
  schedule: '0 * * * *',
};
