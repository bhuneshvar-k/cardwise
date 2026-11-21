# Cardwise

Tells you which of your credit or debit cards earns the most for a purchase in India: Amazon on
Amazon Pay ICICI, Swiggy on HSBC Live+, fuel at IndianOil on the IndianOil HDFC card. It knows
about caps, exclusions, Prime-only rates, card-age limits, UPI rules and fuel surcharge waivers.

The app is an installable, offline-first web app. Cards and spends live in the browser
(IndexedDB). Signing in with Google is optional and syncs them across devices. Card numbers
are never asked for.

## Layout

```
packages/engine     Rewards engine: Zod rule schema, evaluate/rank, caps, periods. No UI, no I/O.
packages/data       Card rules (hand-written + CardAdvisor import), merchants, bundled catalogue.
packages/contracts  Schemas shared by browser and server: stored records, sync, reports, privacy.
packages/db         Drizzle + Postgres: sync, card catalogue with revisions and review queue,
                    reports, account export/delete. PGlite for tests and local development.
apps/web            Next.js 16 app (shadcn/ui, Tailwind 4, Dexie, nuqs, TanStack Query, Serwist,
                    Better Auth, Sentry) plus API routes and the /admin area.
apps/worker         pg-boss jobs: nightly CardAdvisor import (02:30 IST), retention (03:30 IST).
```

## Local setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # embedded Postgres, test sign-in on
pnpm dev                       # http://localhost:3000
```

With the example env, the app migrates and seeds an embedded database in `apps/web/.data/`. Use the
"Test sign-in" form on About; emails in `ADMIN_EMAILS` become admins and see `/admin`. Leave
`DATABASE_URL` empty to run the app with no backend at all.

## Commands

```bash
pnpm test                      # unit tests (all packages)
pnpm test:cov                  # with coverage thresholds
pnpm --filter web build        # production build + service worker
pnpm test:e2e                  # Playwright: device-only and accounts projects, production build
pnpm lint && pnpm typecheck
```

Refresh imported cards from CardAdvisor's open data (CC BY 4.0):

```bash
pnpm --filter @cardwise/data import:cardadvisor
```

## How card rules work

A card has a **base rule**, specific **rules** (merchant, category, MCC range, payment method,
amount bounds, user attributes like Amazon Prime), **caps** (per transaction, statement cycle,
month, quarter or year; shared between rules; can depend on card age), **exclusions**,
**surcharge waivers** and a **currency** with redemption values. The best matching rule wins;
exclusions zero the reward; capped spend earns nothing unless the rule says `afterCap: 'base'`.

Hand-written cards live in `packages/data/src/cards/`, each with sources and a golden test in
`curated.test.ts`. They are marked "review pending" until `review` is set; a review older than 90
days stops counting as verified. Imported CardAdvisor cards replace nothing curated and are shown
as "not reviewed".

## Sync, catalogue and review

- **Sync**: each device keeps an outbox of changed records and posts it to `/api/sync` with the
  highest server version it has seen. The server stores records as JSON, numbers every write from
  one Postgres sequence, never lets an older edit overwrite a newer one, and returns everything
  after the device's cursor. Signing out removes account data from the device.
- **Catalogue**: `/api/catalogue` serves the live cards with an ETag; the app caches them in
  IndexedDB and falls back to the bundled cards offline or without a backend.
- **Imports**: the worker downloads CardAdvisor nightly. New cards go live; small changes apply;
  rate moves of 2+ points, new or removed rules, caps that move by half, changes to admin-edited
  cards and changes to cards a curated card replaces wait in `/admin/review`.
- **Reports**: "Something wrong?" on any result sends a report (rate-limited) to `/admin/reports`.

## Deploying (single VPS)

1. Create a Google OAuth client with redirect URI `https://<DOMAIN>/api/auth/callback/google`.
2. `cp .env.example .env` and fill in `DOMAIN`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`), the Google client, `ADMIN_EMAILS` and optionally `SENTRY_DSN`.
3. `docker compose up -d --build`

That starts Postgres, a one-off migrate and seed, the worker, the web app behind Caddy (HTTPS),
and a daily `pg_dump` into `./backups` (14 kept). Copy `./backups` off the server (e.g. rclone to
R2 or S3); the stack does not do that for you.

## Privacy (DPDP Act 2023 and Rules 2025)

`/privacy` is the notice. Users agree before their first sync; the notice version and time are
stored, and changing `PRIVACY_NOTICE_VERSION` asks everyone again. Users can download all their
data and delete their account from About. Spends older than 18 months and expired sessions are
deleted nightly. Set `PRIVACY_CONTACT` to a real grievance contact before launch.

## Known limits

- Rate limits are in memory; fine for one app server, move them to Postgres/Redis before scaling out.
- Admin card editing is a validated JSON editor, not a form.
- If someone taps a tab within ~0.1 s of typing an amount, nuqs's delayed URL write can cancel the
  navigation (the e2e test waits for the URL to settle).
