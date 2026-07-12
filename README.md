# The Confident Clinician

Static Netlify site for The Confident Clinician Fast Track.

## Pages

- `index.html`
- `workshop.html`
- `program.html`

## Deploy

- Publish directory: `.`
- Build command: none
- Netlify deploys from `main`.

## Purchase tracking

Stripe workshop purchases can be sent to Airtable through:

`https://theconfidentclinician.me/.netlify/functions/stripe-purchase-webhook`

Stripe webhook event:

- `checkout.session.completed`

Required Netlify environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `AIRTABLE_ACCESS_TOKEN`
- `AIRTABLE_PURCHASES_BASE_ID` = `appPQAC82txeqHx9R`
- `AIRTABLE_PURCHASES_TABLE_ID` = `tblL3eHxNfYVLbaf6`
- `FIVE_SKILLS_VIDEO_EMBED_URL`

The access page checks Airtable for a matching `Email` with `Purchased` checked.

Optional field mapping variable if Airtable column names differ:

`AIRTABLE_PURCHASE_FIELD_MAP`

Example:

```json
{
  "name": "Name",
  "email": "Email",
  "workshop": "Workshop",
  "amount": "Amount",
  "currency": "Currency",
  "paymentStatus": "Payment Status",
  "purchaseDate": "Purchase Date",
  "stripeSessionId": "Stripe Session ID",
  "stripePaymentIntent": "Stripe Payment Intent",
  "stripeCustomerId": "Stripe Customer ID",
  "coupon": "Coupon",
  "discount": "Discount",
  "accessPage": "Access Page",
  "purchased": "Purchased"
}
```
