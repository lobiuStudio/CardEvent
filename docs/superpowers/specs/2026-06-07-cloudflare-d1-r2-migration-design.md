# Cloudflare Pages, D1, And R2 Migration Design

## Context

The current CardEvent web app runs as a Next.js app with Prisma on local SQLite and file uploads stored through local disk or the recently added Google Drive adapter. The desired production target is Cloudflare Pages, with Cloudflare D1 for relational data and Cloudflare R2 for uploaded artwork and payment proof files.

This migration replaces the Google Drive storage direction. Organizers and participants should keep using the app upload forms; the app will store files in R2 and persist metadata in D1.

## Goals

- Deploy the app to Cloudflare Pages using the Cloudflare-supported Next.js adapter path.
- Use Cloudflare D1 as the production database for users, activities, submissions, payments, judging, scores, and results.
- Use Cloudflare R2 for submission images and payment proof files.
- Preserve the current participant, admin, judge, and result workflows.
- Keep local development practical with SQLite and local file storage.
- Remove Google Drive configuration and code from the active storage path.

## Non-Goals

- No direct-to-R2 browser upload in the first migration. Uploads continue through app route handlers.
- No public R2 bucket requirement. The app should be able to proxy file reads through an authenticated or opaque app route.
- No redesign of grading, review, payment, or results behavior beyond what Cloudflare runtime requires.
- No migration of existing local development data into production D1; production setup starts from schema migration and seed/admin setup.

## Recommended Architecture

### Deployment Runtime

Use Cloudflare Pages with the Cloudflare Next.js adapter, currently documented through OpenNext for Cloudflare. Add Cloudflare config with:

- `compatibility_date`
- `nodejs_compat`
- D1 binding, recommended name: `DB`
- R2 binding, recommended name: `CARD_EVENT_UPLOADS`
- required environment variables and secrets

The app must avoid Node-only runtime dependencies in deployed server code unless supported by `nodejs_compat`. File system upload storage remains local-only and must not be used in Cloudflare production.

### Database

Keep Prisma schema provider as SQLite-compatible because D1 is SQLite-based. Add Cloudflare D1 support through `@prisma/adapter-d1`.

Create a Prisma client factory that selects:

- Local development and tests: `@prisma/adapter-better-sqlite3` with `DATABASE_URL=file:...`
- Cloudflare runtime: `@prisma/adapter-d1` using the `DB` binding

Because Cloudflare D1 currently has important transaction limitations with Prisma, repository methods using `prisma.$transaction` need a dedicated review and refactor. The migration should replace transaction-dependent flows with explicit sequential writes and targeted compensation where practical. The highest-risk flows are:

- registration with verification token creation
- submission creation with image records
- payment proof confirmation and rejection
- judge invitation acceptance
- judge score upsert plus comment upsert
- draft result generation and publishing

The target behavior is eventual consistency acceptable for an MVP, while avoiding half-created user-facing records when a simple precondition can be checked first.

### File Storage

Replace the Google Drive storage path with an R2 storage provider implementing the existing `FileStorage` interface.

Provider selection:

- `FILE_STORAGE_PROVIDER=local`: existing local disk implementation
- `FILE_STORAGE_PROVIDER=r2`: new R2 implementation

Stored file metadata in D1 should continue to include:

- provider, now `local` or `r2`
- object key as `storageFileId`
- `publicUrl`, preferably `/uploads/<encoded object key>`
- original name
- MIME type
- file size

R2 object keys should be deterministic enough to browse operationally and unique enough to avoid collision:

- submission images: `submissions/<activitySlug>/<submissionId>/<uuid-or-timestamp>-<safeName>`
- payment proofs: `payment-proofs/<activitySlug>/<ownerId>/<uuid-or-timestamp>-<safeName>`

The upload route should validate images before writing to R2, as it does for local files today.

### File Serving

Keep the existing `/uploads/[...path]` route concept, but route reads through a storage provider instead of assuming local disk.

For local development:

- read from `LOCAL_UPLOAD_ROOT`

For Cloudflare production:

- read the object from R2 using `CARD_EVENT_UPLOADS`
- return a `Response` with the stored object body, content type, and cache headers

This avoids requiring a public R2 bucket or custom R2 domain in the first migration.

### Environment And Configuration

Remove Google Drive env requirements from `.env.example`.

Add Cloudflare-oriented configuration:

- `FILE_STORAGE_PROVIDER="local"` for local default
- `FILE_STORAGE_PROVIDER="r2"` for production
- `D1_DATABASE_NAME`
- `D1_DATABASE_ID`
- `R2_BUCKET_NAME`
- binding names documented as `DB` and `CARD_EVENT_UPLOADS`

Secrets remain:

- `SESSION_SECRET`
- SMTP settings if email uses SMTP

### Build And Scripts

Add package scripts for Cloudflare:

- `build:cloudflare`
- `preview:cloudflare`
- `deploy:cloudflare`
- D1 migration generation and application scripts if practical

The exact commands should follow the adapter selected during implementation. The implementation plan must verify the current Cloudflare Next.js adapter command before editing scripts.

### D1 Migrations

Use Prisma schema as the source of truth, but apply D1 migrations through Wrangler. The expected workflow is:

1. Generate SQL from Prisma schema with `prisma migrate diff`.
2. Create Wrangler D1 migration files.
3. Apply locally and remotely with Wrangler.

The implementation should document the final commands in `web/README.md`.

## User Experience

Participant upload forms should remain almost unchanged:

- Participants choose image files in the app.
- The app uploads files to R2 in production.
- Submission confirmation remains the same.

Admin, judge, account, results, and CSV views should continue using stored file URLs. If an R2 object cannot be read, the file route should return a clear 404 instead of breaking the whole page.

## Error Handling

- If image validation fails, do not write to R2.
- If R2 upload fails, do not create the submission or payment proof record.
- If D1 write fails after R2 upload, attempt to delete the newly uploaded R2 objects.
- If email delivery fails, keep the existing log-and-continue behavior.
- If D1 binding or R2 binding is missing in production, fail fast with an actionable error message.

## Testing

Add and run focused tests for:

- storage provider selection: local vs R2
- R2 key generation and stored metadata shape
- upload route behavior with provider abstraction where practical
- file-serving route behavior for missing and present objects where practical
- Prisma client selection or binding guard behavior where practical

Run full verification:

- `npm run typecheck`
- `npm test`
- `npm run e2e -- --project="Mobile Chrome"`
- Cloudflare preview command once configured

Manual verification:

- Create a D1 database and R2 bucket in Cloudflare.
- Configure Pages bindings.
- Deploy or preview the Cloudflare build.
- Submit one card image and one payment proof.
- Confirm D1 rows reference provider `r2`.
- Confirm R2 contains the objects.
- Confirm admin and judge pages can view uploaded images through `/uploads/...`.

## Rollout Plan

1. Add Cloudflare config and scripts without changing local defaults.
2. Replace Google Drive storage with R2 storage provider.
3. Add binding-aware Prisma client creation.
4. Refactor transaction-dependent repository flows for D1 safety.
5. Add D1 migration workflow and README instructions.
6. Verify locally with SQLite/local storage.
7. Verify Cloudflare preview with D1/R2 bindings.

## Risks And Mitigations

- D1 transaction limitations can cause partial writes if repository flows remain unchanged. Mitigation: audit and refactor all `$transaction` usages before claiming Cloudflare support.
- Next.js on Cloudflare Pages requires the correct adapter and compatibility flags. Mitigation: add Cloudflare preview verification before deployment.
- R2 objects may become orphaned if DB writes fail after upload. Mitigation: best-effort delete uploaded objects on DB failure.
- Private file access rules are not yet sophisticated. Mitigation: keep opaque object keys and app-proxied reads for MVP; add authorization later if needed.
