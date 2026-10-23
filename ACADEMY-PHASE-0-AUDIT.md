# The Confident Clinician Academy

## Phase 0 Preservation and Architecture Audit

**Status:** Read-only architecture audit
**Production changes made:** None
**Primary rule:** Preserve every existing Supabase identity, Airtable record, Stripe purchase, enrollment, and saved learner response.

---

## 1. Executive recommendation

The Confident Clinician does not need a replacement course platform. It already has the foundation of an academy:

- Supabase authentication and account recovery.
- Netlify serverless functions.
- Stripe Checkout and signed webhook fulfillment.
- Airtable-backed course participants, content, activity, workbooks, assessments, questions, feedback, purchases, workshop access, resources, and notes.
- A protected course portal and administrative dashboard.
- A workshop/member portal.

The safest next build is a **unified Academy shell and entitlement service** over the existing systems. Existing records remain authoritative during the first release. Migration to a normalized database, if pursued, should occur gradually behind stable APIs.

Do not rebuild authentication. Do not ask existing users to register again. Do not perform a one-time destructive migration.

---

## 2. Current production architecture

```text
Public static HTML website
        |
        +-- Netlify hosting and Netlify Functions
        |
        +-- Supabase Auth
        |      +-- user identities
        |      +-- passwords and recovery
        |      +-- platform_profiles tagging
        |
        +-- Airtable Course Base
        |      +-- Participants
        |      +-- Program Content
        |      +-- Activity
        |      +-- Submissions
        |      +-- Questions
        |      +-- Assessments
        |      +-- Coaching
        |      +-- Workbook Responses
        |
        +-- Airtable Purchases Base
        |      +-- purchaser/member records
        |      +-- workshop access
        |      +-- resources
        |      +-- views
        |      +-- feedback
        |      +-- notes
        |      +-- product views
        |
        +-- Stripe
        |      +-- hosted checkout
        |      +-- signed checkout.session.completed webhook
        |      +-- course-roster and purchase fulfillment
        |
        +-- Resend
               +-- owner notifications and transactional messages
```

### Application surfaces

| Surface | Current purpose | Primary data |
|---|---|---|
| `/course/` | Structured Lab/Intensive learning portal | Supabase Auth + Airtable Course Base |
| `/course/admin.html` | Course content, participant, measurement, feedback, and question administration | Airtable Course Base through authenticated Netlify function |
| `/portal.html` | Purchased workshop and resource library | Supabase password verification or workshop code + Airtable Purchases Base |
| `/access.html` | Routes visitors to course or workshop access | Static navigation |
| `/create-account.html` | Creates Supabase account for verified workshop purchaser | Supabase Admin API + Airtable purchase/access lookup |
| `/member-account.html` | Member account management | Supabase + Airtable |
| Product sales pages | Start server-created Stripe Checkout sessions | Stripe price IDs and Netlify Functions |

---

## 3. Existing capabilities to preserve

### Identity and access

- One existing Supabase Auth tenant.
- Email/password sign-in.
- Secure password recovery.
- Course activation for approved Airtable participants.
- Supabase user ID saved to course participant records.
- Server-side validation of Supabase access tokens.
- Admin access based on course role and configured admin email allowlist.
- Workshop account creation restricted to a verified purchase or access grant.

### Structured learning

- Four-week and twelve-week program distinction.
- Published program content.
- Multiple ordered content records.
- Video, download, transcript, attachment, and workbook fields.
- Lesson completion and course progress.
- Saved workbook responses.
- Milestone submissions and feedback.
- Learner questions and administrator responses.
- Baseline, pulse, post, capstone, and completion-preparation forms.
- Course measurement summaries.
- Course-content administration.

### Commerce and workshop delivery

- Server-created Stripe Checkout sessions.
- Stripe webhook signature validation.
- Duplicate webhook detection using Stripe Checkout Session ID.
- Airtable purchase fulfillment.
- Automatic Clinical Confidence Lab roster synchronization.
- Workshop/resource access mapping.
- Promotional-code support.
- Workshop access records, views, feedback, and notes.
- Purchase-owner notifications.

---

## 4. Current customer journeys

### Lab purchaser

```text
Sales page
  -> Stripe Checkout
  -> signed webhook
  -> purchase record and Lab Participant record
  -> Enrollment Status = Purchased
  -> administrator approves/invites
  -> learner activates existing/new Supabase identity
  -> password link
  -> Enrollment Status = Active
  -> learner signs into /course/
```

### Workshop purchaser

```text
Workshop sales page
  -> Stripe Checkout
  -> signed webhook
  -> purchaser/access record
  -> learner may use workshop access code
  -> learner may create a Supabase account
  -> learner signs into /portal.html
  -> purchased workshops are displayed
```

### Returning user who owns both

Currently the user encounters two related but separate experiences:

- `/course/` for structured programs.
- `/portal.html` for workshops and standalone resources.

The same Supabase identity can participate in both, but there is not yet one server-side session and one dashboard aggregating both sets of entitlements.

---

## 5. Risk register

### P0: Protect before expanding commerce

#### A. Purchase history is not fully normalized

The Stripe webhook checks for an existing purchaser row by email and may update that row with the latest purchase. This is useful for a member profile, but it is unsafe as the sole order ledger when one person buys multiple products. A later purchase can replace product-specific fields from an earlier purchase.

**Required direction:** Separate `users` from immutable `orders` and `order_items`, or create an append-only purchase table while preserving the existing member row.

#### B. Structured course enrollment currently assumes one program per participant row

The Course Participants record contains a single `Program` value. A learner eventually owning both the Lab and the Intensive needs separate enrollment records rather than one program field being overwritten.

**Required direction:** Introduce a many-to-many enrollment model: one identity can have multiple course enrollments.

#### C. Shared workshop passwords remain supported

Workshop access can be authenticated through a member password or a shared workshop access code. Shared codes are useful during transition but are not strong per-person authorization.

**Required direction:** Keep current codes working temporarily, but make authenticated user entitlements the default for new Academy access.

### P1: Fix during Academy shell work

#### D. Workshop portal stores the entered password in `sessionStorage`

The workshop portal stores email and password in browser session storage so it can automatically restore the session. Passwords should not be retained in browser storage.

**Required direction:** Authenticate once with Supabase, store only the session tokens using the selected Supabase client strategy, and send the bearer token to a unified server-side access endpoint.

#### E. The two portals implement different session patterns

The course portal uses a Supabase bearer token. The workshop portal submits email/password or an access code on each access check.

**Required direction:** Create one Academy session and a server-side `my-learning` endpoint that aggregates course and workshop access.

#### F. Course access is matched primarily by email

The course API verifies the Supabase identity and then finds the Airtable Participant by normalized email. Email changes can temporarily disconnect identity from data.

**Required direction:** Prefer Supabase user ID when present, use normalized email only as a compatibility fallback, and backfill missing IDs.

#### G. Access-token refresh is not a mature shared service

The course client stores access and refresh tokens, but the application does not expose a complete shared refresh/session layer for all Academy surfaces.

**Required direction:** Centralize sign-in, refresh, sign-out, and expiration handling.

### P2: Address before scaling content

#### H. Course content is shaped around weeks and programs

The current model works for the Lab but is not yet a general course/module/lesson/block model.

**Required direction:** Add stable course, module, lesson, and content-block identifiers without changing existing Lab content IDs.

#### I. Some paid assets are public URLs

Authorization protects discovery through the portal, but a direct public file or video URL may remain shareable.

**Required direction:** Classify assets by sensitivity. Use private storage or signed/time-limited URLs for paid materials that require stronger protection. Do not claim perfect anti-sharing protection.

#### J. Refund and dispute revocation is incomplete

The webhook handles completed checkouts. A complete Academy entitlement service will also need documented behavior for refunds, disputes, cancellations, manual grants, and reversals.

#### K. Administrative audit history is limited

Manual grants, revocations, content publishing, and role changes need append-only audit records before additional administrators are introduced.

---

## 6. Recommended target architecture

```text
Existing Supabase Auth (unchanged)
                |
        Academy session service
                |
        My Learning API / Entitlement API
          /                         \
Current Course Airtable       Current Purchase Airtable
          \                         /
           unified learner dashboard
                |
     Lab | Workshops | Resources | Future courses
```

### Stable API boundary

The browser should not need to know whether authorization currently comes from Airtable or a future Supabase database. It should call a stable endpoint returning a normalized result such as:

```json
{
  "user": {
    "id": "supabase-user-id",
    "email": "learner@example.com",
    "name": "Learner"
  },
  "entitlements": [
    {
      "id": "entitlement-id",
      "productType": "course",
      "productKey": "clinical-confidence-lab",
      "status": "active",
      "source": "airtable-course-participant",
      "sourceRecordId": "record-id"
    }
  ]
}
```

The response should not include Airtable tokens, Stripe secrets, shared workshop passwords, or raw administrative fields.

### Long-term normalized entities

The future database should distinguish:

- `profiles`: one per Supabase user.
- `products`: sellable offers.
- `prices`: Stripe price versions.
- `orders`: immutable transaction headers.
- `order_items`: one row per purchased product.
- `courses`: learning products.
- `course_modules`: ordered course structure.
- `lessons`: ordered learning units.
- `lesson_content_blocks`: video, text, download, reflection, quiz, scenario, or link blocks.
- `enrollments`: user-to-course access.
- `entitlements`: generalized user-to-product access.
- `lesson_progress`: per-user, per-lesson state.
- `resources`: controlled downloadable assets.
- `scenario_versions`, `scenario_nodes`, `scenario_choices`, and `scenario_attempts`.
- `admin_audit_logs`: immutable administrative changes.

Course content, commerce, entitlements, and learner progress must remain separate concepts.

---

## 7. Safe implementation sequence

### Phase A: Preservation baseline

1. Export both Airtable bases.
2. Export or inventory Supabase Auth users without exposing password data.
3. Export Stripe products/prices and reconcile purchase session IDs.
4. Create a cross-system identity reconciliation report.
5. Identify duplicate emails, missing Supabase IDs, and users with records in only one system.
6. Define test personas for workshop-only, Lab-only, both, admin, invited, refunded, and unauthorized states.
7. Record current production smoke-test results.

**No production schema changes.**

### Phase B: Unified session and My Learning API

1. Reuse the existing Supabase project.
2. Build a shared client session module.
3. Add secure token refresh and sign-out handling.
4. Add a read-only `my-learning` Netlify function.
5. Resolve access from existing Participant, Purchase, Workshop Access, and Product View records.
6. Prefer Supabase user ID and use normalized email as fallback.
7. Return a normalized entitlement list.
8. Do not write or migrate customer records in this phase.

### Phase C: Unified Academy dashboard

1. Replace the access-choice page with a single `My Learning` entry point while preserving legacy URLs.
2. Display `Continue Learning` when structured progress exists.
3. Display every course, workshop, and resource the authenticated person owns.
4. Route each card to the existing working learning surface.
5. Keep the current `/course/` and `/portal.html` paths operational.
6. Add empty, loading, expired-session, and support states.
7. Verify existing users require no password change.

### Phase D: Durable commerce and entitlement records

1. Add append-only order and order-item records.
2. Add generalized entitlements.
3. Make Stripe webhook fulfillment idempotent by event/session and item.
4. Backfill existing purchases without deleting existing Airtable rows.
5. Add refund, dispute, manual grant, and revocation workflows.
6. Run dual-read comparisons before switching authorization.

### Phase E: General course model and administration

1. Add course/module/lesson/content-block records.
2. Preserve every existing Lab content ID.
3. Render the Lab from old and new models in parallel.
4. Compare structure, access, and progress.
5. Extend the current admin dashboard instead of replacing it abruptly.
6. Migrate one course only after acceptance tests pass.

### Phase F: Branching scenario engine

Build versioned, non-AI clinical scenarios first. Keep scenario content separate from student attempts. Do not reduce clinical competence to one automated score.

### Phase G: AI simulations

Begin only after identity, entitlements, progress, scenario versioning, privacy rules, usage limits, and administrative cost controls are stable.

---

## 8. Acceptance tests required before the Academy shell launches

1. An existing Lab learner signs in with the same password.
2. An existing workshop learner signs in with the same Supabase account.
3. A learner who owns both sees both without creating another account.
4. A workshop access-code user can still access the legacy path during transition.
5. An invited-but-not-active Lab learner sees the correct activation flow.
6. An unauthorized user sees no paid content.
7. A user cannot obtain access by editing browser state.
8. An expired token refreshes or produces a clear sign-in prompt.
9. Changing an email does not orphan purchases or progress.
10. Buying a second product preserves the first product.
11. A duplicate Stripe webhook creates no duplicate order or entitlement.
12. A refund/revocation removes current access without deleting history.
13. Existing workbook, assessment, activity, and feedback records remain attached.
14. Admin routes reject authenticated non-admin users.
15. Legacy links continue to work.
16. Mobile and keyboard navigation work throughout sign-in and My Learning.

---

## 9. Decisions to make before implementation

### Decision 1: Academy naming

Recommended public label: **My Learning** for the navigation item and **The Confident Clinician Academy** for the authenticated environment.

### Decision 2: Legacy workshop codes

Recommended: keep them during transition, stop issuing them for new products once unified accounts are stable, and do not remove them until affected customers are contacted.

### Decision 3: Data system for the first Academy release

Recommended: keep Airtable as the source for existing products and access during the first release. Do not block the dashboard on a database migration.

### Decision 4: Long-term database

Recommended: Supabase Postgres is the likely long-term system for normalized orders, enrollments, entitlements, progress, and simulations. It should be introduced through migrations and parallel validation, not direct manual edits.

### Decision 5: Video hosting

Recommended: do not choose Mux yet. First inventory the number, length, privacy requirement, and expected viewing volume of videos. Use protected playback only where the business requirement justifies the cost and complexity.

---

## 10. Recommended first implementation milestone

**Milestone:** A read-only Academy dashboard powered by the existing Supabase identity and existing Airtable records.

The milestone is successful when:

- Existing users sign in with unchanged credentials.
- One page shows all owned courses, workshops, and resources.
- The page accurately distinguishes owned products from recommendations.
- Existing course and workshop pages remain the actual learning destinations.
- No existing production record is migrated or deleted.
- No shared password is stored in browser storage by the new Academy interface.

This milestone delivers visible value while creating the API boundary needed for all later Academy work.
