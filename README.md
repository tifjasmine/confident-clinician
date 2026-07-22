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
- `AIRTABLE_VIEWS_TABLE_ID` = `Views` unless you want to use the table ID
- `FIVE_SKILLS_VIDEO_EMBED_URL`
- `FIVE_SKILLS_ACCESS_PASSWORD`

The access page requires the workshop password and checks Airtable for a matching `Email` with `Purchased` checked.
When access is confirmed, it also creates a record in the `Views` table so you can track who opened the workshop, when they opened it, and how many times they returned.
The workshop purchase buttons use `/.netlify/functions/create-five-skills-checkout`, which creates a Stripe Checkout session from `FIVE_SKILLS_STRIPE_PRICE_ID`. The member portal at `/portal.html` checks the same purchase email and password, then shows available workshop access pages.

Member account setup uses `/create-account.html`. Add these fields to the main Airtable purchaser/user table:

- `Account Created` checkbox
- `Account Created At` date/time
- `Account Password Hash` long text

Workshop notes use a separate Airtable table named `Workshop Notes` by default. Add these fields:

- `Name` single line text
- `Student` linked record to the main purchaser/user table
- `Workshop` single line text
- `Notes` long text
- `Updated At` date/time

For future growth, the clean Airtable structure is:

- `Users` or `Students`: one row per person/email
- `Purchases`: one row per product purchased, linked to the user
- `Views`: one row each time someone opens a workshop
- `Workshop Notes`: one row each time notes are saved

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

Optional view tracking field mapping if Airtable column names differ:

`AIRTABLE_VIEW_FIELD_MAP`

Default:

```json
{
  "name": "Name",
  "student": "Student",
  "viewedAt": "Viewed At",
  "notes": "Notes"
}
```

## Free guidebook access

The guidebook page lives at `/imposterguidebook` and opens `imposterguidebook.html`.
Visitors enter their name and email before the guidebook appears. That submission is saved to Airtable through:

`https://theconfidentclinician.me/.netlify/functions/product-view`

Default Airtable setup:

- Base: `AIRTABLE_PURCHASES_BASE_ID` or `appPQAC82txeqHx9R`
- Table: `AIRTABLE_PRODUCT_VIEWS_TABLE_ID` or `Product Views`
- Fields: `Name`, `Email`, `Product`, `Opened`, `Notes`

Optional field mapping variable if Airtable column names differ:

`AIRTABLE_PRODUCT_VIEW_FIELD_MAP`

Default:

```json
{
  "name": "Name",
  "email": "Email",
  "product": "Product",
  "opened": "Opened",
  "notes": "Notes"
}
```
