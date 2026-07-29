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

## Founding cohort course app

The secure course portal lives at `/course/` and the admin dashboard lives at
`/course/admin.html`.

Authentication is handled by Supabase Auth. Airtable stores the participant
roster, privacy-safe activity, milestone submissions, feedback, and course
questions. Passwords are never stored in Airtable.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `AIRTABLE_ACCESS_TOKEN`
- `AIRTABLE_COURSE_BASE_ID` = `app9RCJ6ivTCgwDsl`
- `AIRTABLE_COURSE_PARTICIPANTS_TABLE_ID` = `tbl9GaXjTRDTm4eg9`
- `AIRTABLE_COURSE_ACTIVITY_TABLE_ID` = `tblUggqFGAT3f21O5`
- `AIRTABLE_COURSE_SUBMISSIONS_TABLE_ID` = `tblvjyk8Sb0jF5RFN`
- `AIRTABLE_COURSE_QUESTIONS_TABLE_ID` = `tblZgodoLmkg2QVjV`
- `AIRTABLE_COURSE_CONTENT_TABLE_ID` = `tblbR7GbCYnRoLLUm`
- `AIRTABLE_COURSE_ASSESSMENTS_TABLE_ID` = `tblDB1IkqgRT9bjYZ`
- `AIRTABLE_COURSE_COACHING_TABLE_ID` = `tbl975NGzYmTTtcCc`
- `AIRTABLE_COURSE_WORKBOOK_TABLE_ID` = `tblEUY3qUu82ysKUL`
- `COURSE_ADMIN_EMAILS` = comma-separated Supabase account emails allowed to
  use the admin dashboard

To enroll a member, create their Supabase account and add a matching email to
the Airtable `Participants` table. In the invitation-only course flow, Tiffany
adds the member to Airtable first and sets `Enrollment Status` to `Invited`.
The participant clicks **Activate account** on `/course/`; the server confirms
the roster match, creates the Supabase identity when needed, and sends a secure
password-setup email. There is no public course signup endpoint.

Set `Role` to `Admin` only for course administrators. The portal verifies every
request against Supabase before reading or writing Airtable.

The same portal supports both `Clinical Confidence Lab` (4 weeks) and
`Confident Clinician Intensive` (12 weeks). Set the participant's `Program`
field to choose the correct curriculum. Stripe purchases for the Lab are added
to the roster with `Enrollment Status` set to `Purchased`; Tiffany changes that
status to `Invited` when the participant is approved to activate an account.

Course videos, PDFs, worksheets, transcripts, and links are managed in the
`Program Content` table or through the admin dashboard's **Course Content**
panel. Only records with `Published` checked appear in the participant portal.
Add multiple ordered content records to publish multiple videos in one week.
Workbook prompts are entered one per line and render as private, saved answer
boxes. Responses are stored in the `Workbook Responses` table by participant,
program, week, and content ID.

The Clinical Confidence Lab assessment flow is built into the same portal:
baseline and success plan before Week 1, a pulse check in each program week,
post-assessment and CLEAR capstone after Week 4, and one completion-session prep
form. Participant responses and calculated CCI/CII summaries are stored in the
`Assessments` table and surfaced in the admin **Measurements** panel.

Add `https://theconfidentclinician.me/course/set-password.html` to the allowed
redirect URLs in Supabase Auth URL Configuration so activation emails return
members to the course password screen.

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

The Clinical Confidence Lab purchase button uses `/.netlify/functions/create-clinical-confidence-lab-checkout`. It creates a Stripe Checkout session with promotion codes enabled and uses `CLINICAL_CONFIDENCE_LAB_STRIPE_PRICE_ID` when configured (falling back to the current founding-price ID).

## Interest-form email notifications

Interest forms save to Airtable first, then send a direct notification email through Resend. Configure these Netlify environment variables with Functions scope:

- `RESEND_API_KEY`
- `FORM_NOTIFICATION_EMAIL` = the inbox that should receive each submission
- `FORM_NOTIFICATION_FROM` = a sender on a domain verified in Resend, for example `The Confident Clinician <notifications@theconfidentclinician.me>`

If Resend is temporarily unavailable, the Airtable submission remains saved and the email failure is logged without asking the visitor to resubmit.

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
