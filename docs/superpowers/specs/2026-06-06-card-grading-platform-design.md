# Card Grading Activity Platform Design

## Summary

Build a full-stack web platform for hand-drawn game card grading activities. The platform supports two activity modes:

- Competition mode: participants submit hand-drawn cards, judges grade them, and published results show public rankings by group.
- Grading mode: participants submit hand-drawn cards, judges grade them, and each participant privately receives the final grading result for their own cards.

Both modes share the same account, activity, upload, review, payment proof, judging, and result calculation workflows. The main difference is result visibility.

## Goals

- Let participants publicly register and submit hand-drawn game cards through the website.
- Let admins create configurable activities with rules, groups, grading criteria, deadlines, submission limits, payment settings, and judge invitations.
- Store submitted card images in a fixed platform Google Drive account using a clear folder structure.
- Let judges independently grade all eligible submissions for an activity.
- Calculate final grading scores from all judge criteria scores and round to the nearest 0.5.
- Let admins review and publish final results.
- Provide a mobile-first user experience because most participants and judges are expected to use the website on phones.
- Keep the MVP practical by avoiding payment gateway integration, complex judge assignment, weighting, or automatic tie-breakers.

## Non-Goals For MVP

- No Stripe, PayMe, FPS, or other direct payment gateway integration.
- No automatic judge assignment or partial judging allocation.
- No weighted grading criteria.
- No admin override of judge scores.
- No public gallery during active submission or judging.
- No Google login. Authentication uses email and password.

## Roles

### Participant

- Can register publicly with email, password, and display name.
- Can browse public activity pages before logging in.
- Must log in to submit cards, manage submissions, view submission status, upload payment proof, and view final private results.
- Can edit, replace images, or delete submissions before the submission deadline.
- Can view final result details for their own cards after admin publishes results.

### Admin

- The system starts with one initial admin account.
- Admins can invite or create additional admins.
- Admins can create and manage activities.
- Admins can invite judges to specific activities.
- Admins can review submissions, reject submissions with reasons, confirm payment proof, monitor judging progress, export data, and publish results.
- Admins cannot directly edit judge scores. If a score has an issue, admins must ask the judge to revise it before the judging deadline.

### Judge

- Judges join an activity through an invitation link.
- A judge may register or log in through the invitation link and becomes attached to that activity.
- Judges must grade every eligible submission in their assigned activity.
- Judges grade independently and cannot see other judges' scores while judging.
- Judges can edit their own scores and optional comments until the judging deadline.

## Activity Configuration

Admins can create activities with these fields:

- Mode: competition or grading.
- Title and description.
- Rules written in Markdown.
- Submission start time.
- Submission deadline.
- Judging deadline.
- Expected result announcement time.
- Per-participant card submission limit.
- Maximum images per card.
- Whether admin submission review is required.
- Whether judge view is anonymous.
- Whether payment is required.
- Payment instructions.
- Payment charging mode: per card or per participant per activity.
- Custom groups, such as Open, Junior, Senior, or any admin-defined group.
- Grading criteria shared across the whole activity.

Each grading criterion has:

- Name.
- Optional description.
- Display order.
- Score range from 0 to 10, supporting 0.5 increments.

Activity groups affect classification, filtering, and competition rankings. They do not change grading criteria in the MVP.

## Public Activity Page

Anyone can view:

- Activity title and description.
- Rules.
- Important dates and deadlines.
- Grading criteria.
- Submission requirements.
- Payment instructions, if the activity is paid.

Submitting cards, viewing own status, and viewing own final results require login.

## Mobile-First UX Requirements

The primary UX target is mobile web in portrait orientation. Desktop and tablet layouts should be supported, but they are secondary expansions of the mobile experience rather than the starting point.

### General Mobile Principles

- All core participant and judge workflows must work comfortably on 360px to 430px wide mobile screens.
- Pages must avoid horizontal scrolling.
- Primary actions should be thumb-friendly and placed near the bottom of the screen where appropriate, especially submit, save, next, score, upload, and publish-review actions.
- Interactive targets should be at least 44px high and wide where practical. Dense text links may follow WCAG minimum target rules, but primary controls should use the larger mobile target.
- Forms should use one-column layouts on mobile.
- Long forms should use progressive disclosure, step-based sections, or collapsible optional fields.
- Required fields should be visually clear. Optional fields should not make the submission flow feel long or bureaucratic.
- Mobile browsers' safe areas and bottom browser toolbars must be considered so sticky bottom actions do not become hidden or hard to tap.
- Loading, upload, validation, and save states must be explicit and visible on small screens.

### Participant Mobile UX

Participant workflows should prioritize speed and confidence:

- Activity detail pages should show the most important information first: status, deadlines, submission button, rules summary, payment requirement, and grading criteria.
- Card submission should feel like a guided flow: card details, image upload, optional details, payment proof if needed, review and submit.
- Image upload should support choosing from the camera or photo library where the browser allows it.
- Uploaded images should show mobile-friendly thumbnails, upload progress, validation errors, and a clear way to remove or replace images before the deadline.
- Submission status should be shown with short, plain labels such as pending review, rejected, payment pending, eligible for judging, judging, and completed.
- Rejection reasons should be easy to find and paired with the action to edit and resubmit when the deadline still allows it.

### Judge Mobile UX

Judge workflows should make repeated scoring efficient:

- The judging dashboard should show remaining cards, completed cards, deadline, and progress.
- Judges should be able to score one card at a time with clear next and previous navigation.
- Card images should support zooming or opening a larger mobile-friendly viewer.
- Criteria scoring controls must support 0.5 increments without requiring difficult text entry. A segmented stepper, slider with fixed stops, or numeric control can be used if it remains accessible.
- The optional overall comment should be available but not visually dominant.
- A sticky progress or save state should make it clear whether the current card's scores are saved.

### Admin Mobile UX

Admin workflows may be more data-heavy, but must still be usable on mobile:

- Admin tables should collapse into scan-friendly cards or grouped lists on mobile.
- Filters and sort controls can use bottom sheets or compact panels.
- Dashboards should prioritize actionable queues: pending review, pending payment, missing scores, and ready to publish.
- Activity creation should be a wizard or sectioned form so admins do not face one very long mobile page.
- CSV export and result publishing should require clear confirmation states on mobile.

### Visual Direction And 2026 UI/UX Influence

The visual design should reference current 2026 UI/UX direction pragmatically:

- Clean, low-noise layouts with strong information hierarchy.
- Content-first screens that make deadlines, status, scores, and actions obvious.
- Accessible color contrast and readable type over decorative effects.
- Subtle tactile or hand-crafted visual details that fit hand-drawn card grading, such as paper-like surfaces, restrained texture, or scan-like image framing.
- Gentle motion for state changes, upload progress, and scoring feedback, while respecting reduced-motion preferences.
- Adaptive role-based dashboards so participants, judges, and admins see the tasks relevant to them first.

The design should not chase trends that reduce clarity. Heavy glass effects, excessive animation, decorative gradients, or AI-style visual gimmicks should be avoided unless they directly improve comprehension or trust.

## Submission Workflow

Participants submit directly into an activity. There is no separate registration step for an activity; the first card submission counts as participation.

Required fields per card:

- Card name.
- At least one card image.

Optional fields per card:

- Game or series.
- Character or card type.
- Description.
- Author display name.

If the activity has one or more groups, the participant must choose a group for each submitted card.

Image restrictions:

- Allowed formats: JPG, PNG, WebP.
- Maximum size per image: 10MB.
- Maximum image count per card is defined by the activity.

Before the submission deadline, participants can:

- Edit text fields.
- Replace or add images within the activity image limit.
- Delete a submission.
- Resubmit after rejection if there is still time.

After the submission deadline, submissions are locked.

## Google Drive Storage

The platform uses one fixed Google Drive account for uploads. Admins do not need to connect their own Google accounts.

Folder structure:

```text
Platform Drive Root
+-- Activity Folder
    +-- Card Submission Folder
        +-- image-1.jpg
        +-- image-2.png
        +-- ...
```

For each uploaded file, the system stores metadata in the database:

- Google Drive file ID.
- Google Drive web link.
- Original filename.
- MIME type.
- File size.
- Upload timestamp.

If a participant replaces images before the submission deadline, the MVP marks old file records inactive and keeps the replacement files as the current active images. Immediate Google Drive deletion is deferred to a later cleanup task so submission edits remain safe and auditable.

## Review And Payment Workflow

Activities may require admin review, payment, both, or neither.

### Submission Review

If review is required:

- New or resubmitted cards enter a pending review state.
- Admins can approve or reject each card.
- Rejection can include an optional reason.
- Participants can see the rejection reason.
- Participants can edit and resubmit before the submission deadline.
- Rejected cards are not visible to judges for scoring.

If review is not required:

- Submitted cards can become eligible for judging once any required payment condition is satisfied.

### Payment Proof

Paid activities use payment proof upload in the MVP.

Charging mode:

- Per participant per activity: the participant uploads one payment proof for the activity.
- Per card: the participant uploads one payment proof per card.

Admins can confirm payment proof manually. Unconfirmed paid submissions are not eligible for judging.

Payment proof should accept image files using the same JPG, PNG, WebP, 10MB limit unless the implementation later adds PDF support.

## Judging Workflow

A submission is eligible for judging when:

- It is submitted before the deadline.
- It is approved, if the activity requires review.
- Payment is confirmed, if the activity requires payment.
- It has not been deleted or rejected.

Each judge must score every eligible card in the activity.

Judge scoring:

- Each criterion score is from 0 to 10.
- Scores support 0.5 increments.
- Each judge can add one optional overall comment per card.
- Judges can modify scores and comments until the judging deadline.
- Judges cannot see other judges' scores while judging.

Anonymous judging:

- If enabled, judges do not see participant identity or author display names.
- If disabled, judges can see the participant display name or submitted author display name.

## Score Calculation

The final score for a card is calculated from all judge scores across all criteria:

1. Collect every submitted score for the card from every judge and every criterion.
2. Calculate the arithmetic average.
3. Round the result to the nearest 0.5.
4. Display it as a score out of 10, such as `8 / 10` or `8.5 / 10`.

Per-criterion average scores are also calculated for participant private result pages.

The MVP does not support criterion weighting.

## Result Publishing

Results are never automatically public. The system calculates draft results after judging is complete, then admins review and publish.

Before publishing, admins can:

- View final calculated scores.
- View ranking previews.
- Check missing judge scores.
- Ask judges to revise scores before the judging deadline.

Admins cannot overwrite judge scores or manually change rankings in the MVP.

After publishing:

- Participants can view their own final results.
- Competition activity public result pages become available.
- Grading activity results remain private to each participant.

## Competition Results

Competition mode publishes:

- Public ranking by group.
- Card image or images selected for display.
- Card name.
- Group.
- Final score.
- Rank.

Tie handling:

- Equal final scores share the same rank.
- If two cards are rank 1, the next rank is 3.
- There is no automatic tie-breaker in the MVP.

Public competition ranking only shows final total scores. It does not show per-criterion average scores or judge comments.

## Grading Results

Grading mode does not publish other participants' cards or scores.

Each participant can privately view:

- Final score.
- Per-criterion average scores.
- Anonymous judge overall comments.
- Submitted card metadata and images.

Judge identities are not shown to participants.

## Admin Dashboard

Admins need activity-level progress views:

- Activity status and deadlines.
- Total submission count.
- Approved, rejected, and pending review counts.
- Pending payment confirmation count.
- Per-judge completion count.
- Per-card received judge score count.
- Missing judge scores.
- Time remaining until submission and judging deadlines.

Admins need export tools:

- CSV result export.
- CSV or spreadsheet-compatible export of Google Drive image links.
- Suggested export fields include activity, mode, group, participant display name, card name, status, payment status, final score, per-criterion averages, and Drive links.

## Email Notifications

MVP email notifications:

- Registration verification.
- Judge invitation.
- Submission received.
- Submission rejected, including rejection reason when provided.
- Activity completed or results available.

Deadline reminders and judge incomplete reminders are useful future enhancements but not required in the MVP.

## Main Data Entities

Expected core entities:

- User: email, password hash, display name, email verification state.
- Role or membership: participant, admin, judge activity membership.
- Activity: mode, rules, dates, settings, Drive folder reference.
- Activity group: name and display order.
- Grading criterion: activity, name, optional description, display order.
- Judge invitation: activity, token, expiry, accepted state.
- Submission: activity, participant, group, card metadata, status, payment status, review status.
- Submission image: submission, Drive file metadata, active state.
- Payment proof: activity or submission scope, Drive file metadata, review status.
- Review decision: admin, submission, decision, reason, timestamp.
- Score: judge, submission, criterion, numeric score.
- Judge comment: judge, submission, optional overall comment.
- Result snapshot: calculated final score, per-criterion averages, rank, published state.

## Access Control

Access rules:

- Public users can view public activity pages.
- Participants can only manage and view their own submissions and private results.
- Judges can only view and score eligible submissions for activities where they accepted an invitation.
- Judges cannot access other judges' scores while judging.
- Admins can manage all activities, submissions, payment proofs, judges, results, and exports.
- Public competition results are visible only after admin publishes them.
- Grading results are private and never become a public gallery in the MVP.

## Error Handling And Edge Cases

- If a Google Drive upload fails, the submission should not be marked complete. The user should be able to retry.
- If a Drive file is uploaded but database saving fails, the system should record enough context to clean up or reconcile later.
- If the submission deadline passes while a user is editing, save should be rejected with a clear deadline message.
- If payment is required but not confirmed, the card remains blocked from judging.
- If review is required and a card is pending or rejected, it remains hidden from judges.
- If not all judges have scored all eligible cards, admins can see the missing score list. The MVP blocks result publishing until all required judge scores exist.
- If a judge invitation link is expired or already invalid, the judge should see a clear error and contact the admin.
- If an activity has no eligible submissions, result publishing should show an empty-state review instead of failing.

## Suggested MVP Screens

Participant:

- Activity listing.
- Activity detail and rules page.
- Register, login, and email verification pages.
- My submissions for an activity.
- Submission create/edit page.
- Payment proof upload page when needed.
- Private result page.

Judge:

- Invitation accept page.
- Judge activity dashboard.
- Submission scoring list.
- Submission scoring detail page.

Admin:

- Admin activity list.
- Activity create/edit wizard.
- Submission review dashboard.
- Payment proof review dashboard.
- Judge invitation management.
- Judging progress dashboard.
- Result review and publish page.
- Export page or export actions.

Public:

- Activity detail page.
- Published competition ranking page.

## Testing Strategy

Core testing should cover:

- Role-based access control for participant, judge, admin, and public users.
- Activity creation with modes, criteria, groups, deadlines, and settings.
- Submission limits and deadline locking.
- Image validation for format, count, and size.
- Google Drive upload metadata persistence.
- Review and rejection resubmission flow.
- Payment proof flow for both charging modes.
- Judge invitation acceptance.
- Judge scoring with 0.5 increments.
- Final score calculation and rounding to nearest 0.5.
- Competition ranking with tied ranks.
- Result publish gating.
- Private versus public result visibility.
- CSV export content.
- Mobile viewport coverage for participant submission, judge scoring, admin review, payment proof review, and result publishing.
- Touch target checks for primary mobile controls.
- Upload and scoring flows on common mobile widths, including 360px, 390px, 414px, and 430px.

## Open Implementation Decisions

These are implementation choices, not product requirement blockers:

- Exact technology stack, though a full-stack React/Next.js application with PostgreSQL is recommended.
- Exact email provider.
- Exact Google Drive authentication method, likely a service account or OAuth-controlled platform account depending on deployment constraints.
- Whether payment proof supports PDF in a later version.
