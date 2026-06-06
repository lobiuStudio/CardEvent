# Card Grading Web App

## Setup

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

## Verification

```bash
npm run typecheck
npm test
npm run e2e -- --project="Mobile Chrome"
```
