# Cardwise

Tells you which of your credit or debit cards earns the most for a purchase in India: Amazon on
Amazon Pay ICICI, Swiggy on HSBC Live+, fuel at IndianOil on the IndianOil HDFC card. It knows
about caps, exclusions, Prime-only rates, card-age limits, UPI rules and fuel surcharge waivers.

The app is an installable, offline-first web app. Cards and spends stay in the browser
(IndexedDB); nothing is sent to a server. Card numbers are never asked for.

## Layout

```
packages/engine   Rewards engine: Zod rule schema, evaluate/rank, caps, periods. No UI, no I/O.
packages/data     Card rules (hand-written + CardAdvisor import), merchants, catalogue.
apps/web          Next.js 16 app (App Router, shadcn/ui, Tailwind 4, Dexie, nuqs, TanStack Query, Serwist).
```

## Commands

```bash
pnpm install
pnpm dev                       # http://localhost:3000
pnpm test                      # unit tests (all packages)
pnpm test:cov                  # with coverage thresholds
pnpm --filter web build        # production build + service worker
pnpm test:e2e                  # Playwright, against the production build
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

## Deploying (single VPS)

```bash
cp .env.example .env           # set DOMAIN
docker compose up -d --build   # Caddy (HTTPS) + Next.js standalone server
```

## Not built yet

- Google sign-in (Better Auth), sync API and Postgres (Drizzle)
- Admin review queue, user "this is wrong" reports, nightly import job (pg-boss)
- Sentry error tracking
- Privacy notice and consent flow needed once accounts exist (DPDP Rules, from May 2027)
