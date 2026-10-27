# Clinical Confidence Lab 2026 - Curriculum and System Audit

Source of truth: `4-week lab full .pdf` (70 pages, October 2026 working production manuscript).

## Manuscript inventory

- Orientation: one welcome video, course navigation, first reflection, and private baseline practice.
- Week 1 - The Therapist Behind the Therapy: 3 teaching videos, 1 demonstration, The Advice Request, The Long Silence, reflection/retry, Clinical Confidence Profile.
- Week 2 - Getting Unstuck in the Room: 3 teaching videos, 1 demonstration, Everything at Once, The Reassurance Loop, reflection/retry, Clinical Decision-Making Map.
- Week 3 - From Conversation to Clinical Movement: 3 teaching videos, 1 demonstration, A Connected but Wandering Session, Five Minutes Left, reflection/retry, 50-Minute Session Roadmap.
- Week 4 - Become a Clinician You Can Trust: 3 teaching videos, 1 demonstration, The Missed Connection, The Plateau, reflection/retry, Personal Clinical Playbook + 30-Day Plan.
- Capstone: One Fictional Session, Several Decisions (Jordan; five staged decisions).
- Recordings: 1 welcome, 12 teaching lessons, and 4 demonstrations. Written cases and answer keys are not videos.
- Excluded from the student experience: camera directions, creator checklists, Skool publishing instructions, VSL, promotion, and sales material.

## Existing system that must remain authoritative

- Supabase authentication and existing student accounts.
- Airtable Participants, Program Content, Course Activity, Workbook Responses, Assessments, Milestone Submissions, Course Questions, and Coaching Calls.
- Stripe webhook enrollment and existing manual/promotional enrollment.
- Existing `/course/` application, admin, saved progress, workbook responses, and assessment records.
- Wistia is the video platform. Store a Wistia embed/share URL or media ID in Program Content; render a responsive player and show a real placeholder when the field is empty.

## Important mismatch discovered

The live Airtable course currently contains a prior curriculum with up to eight lesson records per week, duplicate legacy records, and titles that do not map one-to-one to the October manuscript. The manuscript specifies three teaching lessons, one demonstration, two staged cases, one reflection/retry, and one weekly tool per week.

Reusing old lesson IDs for different manuscript lessons would falsely transfer completion to unrelated content. Existing records and progress must not be deleted or overwritten.

## Safe migration strategy

1. Keep every existing record and response intact.
2. Add a versioned `CCL-2026-v2` curriculum using stable IDs.
3. Reuse an existing ID only where the learning asset is genuinely the same (for example, the existing welcome asset after review).
4. Keep all new records unpublished until the student preview is approved and the corresponding Wistia media is assigned.
5. Gate content by participant `Program Version`, with an explicit admin-controlled upgrade path for existing students.
6. Preserve legacy progress as historical progress; do not mark new lessons complete unless an explicit equivalency mapping is approved.
7. Test with a dedicated test student before enabling the version for paid enrollments.

## Curriculum conflicts requiring explicit resolution

- The repeatable five-domain rubric uses 0-2; the separate six-dimension scorecard uses 0-3 or N/O. Keep them separate and do not calculate a combined competency score.
- The manuscript includes both a low-stakes baseline and existing site assessments. Extend the existing assessment record rather than creating a duplicate assessment.
- The current progress formula assumes a fixed number of activity types per week. The new course needs activity-level totals based on the versioned curriculum.

## Incremental build order

1. Version-aware course dashboard and Start Here experience.
2. Reusable staged case player, first tested with The Advice Request.
3. Import all 12 lesson, 4 demonstration, 8 case, 4 tool, and capstone records as unpublished drafts.
4. Private autosave, retry history, rubric reflection, and printable tools.
5. Five-stage capstone and baseline comparison.
6. Admin editing, Preview as Student, role checks, and complete mobile/accessibility testing.

Production must remain unchanged until enrollment, authorization, privacy, progress, retry, answer-gating, and mobile workflows pass end-to-end testing.
