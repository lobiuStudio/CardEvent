# Card Grading Web App

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Default local admin:

- Email: `admin@example.com`
- Password: `change-this-password`

Use a stronger password before any shared deployment.

## Local Verification

```bash
npm run typecheck
npm test
npm run e2e -- --project="Mobile Chrome"
```

## Cloudflare Resources

Create the production D1 database and R2 bucket:

```bash
npx wrangler login
npx wrangler d1 create cardevent-db
npx wrangler r2 bucket create cardevent-uploads
```

Record the `database_id` printed by `wrangler d1 create`. Configure the Cloudflare Pages project with these bindings:

- D1 binding: `DB` -> `cardevent-db`
- R2 binding: `CARD_EVENT_UPLOADS` -> `cardevent-uploads`

Set these production environment variables in Cloudflare Pages:

```env
DATABASE_PROVIDER=d1
FILE_STORAGE_PROVIDER=r2
EMAIL_PROVIDER=console
```

Add a Cloudflare Pages secret named `SESSION_SECRET`. Generate the value locally with:

```bash
openssl rand -base64 32
```

For SMTP email, set the existing SMTP variables in Cloudflare Pages secrets and change `EMAIL_PROVIDER` to `smtp`.

## D1 Schema

Generate the initial D1 SQL from the Prisma schema:

```bash
npm run d1:migration:init
```

Apply it to local and remote D1:

```bash
npm run d1:apply:local
npm run d1:apply:remote
```

For later schema changes, create a new SQL file under `prisma/migrations/` with `prisma migrate diff`, inspect it, then apply it with Wrangler.

## Cloudflare Build And Deploy

Preview the Cloudflare runtime locally:

```bash
npm run preview:cloudflare
```

Deploy through Cloudflare:

```bash
npm run deploy:cloudflare
```

For Cloudflare Pages Git integration, use:

- Build command: `npm run build:cloudflare`
- Output directory: `.open-next/assets`

## Production Admin Setup

The simplest production admin path is:

1. Register an account through the deployed site.
2. In Cloudflare D1, add the `admin` role for that user:

```bash
npx wrangler d1 execute cardevent-db --remote --command 'INSERT INTO "UserRole" ("id", "userId", "role", "createdAt") SELECT lower(hex(randomblob(12))), "id", "admin", CURRENT_TIMESTAMP FROM "User" WHERE "email" = "admin@example.com";'
```

Use the registered production admin email in place of `admin@example.com`.

## Manual Production Verification

After deploying:

1. Create an activity as admin.
2. Register a participant account.
3. Submit one card image.
4. Upload one payment proof when payment is enabled.
5. Confirm D1 rows in `SubmissionImage` and `PaymentProof` use `storageProvider = "r2"`.
6. Confirm `cardevent-uploads` contains objects under `submissions/` and `payment-proofs/`.
7. Open admin, judge, account, and public results pages and verify images load through `/uploads/...`.
