# Architecture

Single Next.js (App Router) + TypeScript app, SQLite via Prisma (schema kept Postgres-compatible),
custom credentials session (bcryptjs + jose cookie JWT; same trust shape as NextAuth credentials:
hashed passwords, server-side role checks on every route).

```
src/
  app/
    (app)/          authed pages (dashboard, log, meters, trends, leaderboard, challenges,
                    feed, impact, review, audit, reports, settings, import)
    api/            route handlers: auth/{login,logout}, ingest, readings, commute, review,
                    meters, import-csv, reports, certificate
    login/
  components/       nav, charts (recharts), offline-sync
  lib/
    db.ts           prisma singleton
    auth/session.ts jose JWT cookie session
    audit/chain.ts  pure hash-chain build/verify (SHA-256 over prevHash|actor|action|ts|payload)
    audit/store.ts  append-only writer + chain verifier
    scoring/        config (weights+benchmarks), normalize, engine, compute (snapshot materializer)
    ingest.ts       zod-validated idempotent ingest + jump detection
    rollup.ts       MonthlyRollup materializer (VERIFIED+PENDING, flagged excluded)
    reports/        build (gather), pdf (pdfkit), xlsx (exceljs)
    offline-queue.ts IndexedDB queue for offline logging
prisma/
  schema.prisma     all models, indexes incl. (location_id, period_start, category)
  seed.ts           full demo dataset (npm run seed)
config/naac-template.json
scripts/            simulate-iot.ts, verify-audit-chain.ts, award-badges.ts
tests/              vitest: scoring, audit chain, ingest idempotency, challenges
docs/               SCORING / DATA_INTEGRITY / ARCHITECTURE / IMPACT
```

## Scaling to a multi-building campus with thousands of contributors
- Readings are append-only and indexed on (location_id, period_start, category); dashboards never
  scan raw rows — they read `MonthlyRollup` (one row per location/period/category) which is
  refreshed by a scheduled job (`npm run rollup`, or a cron route) instead of at request time.
- Monthly rollups mean dashboard queries are O(locations × months), not O(raw readings).
- The IoT ingest path is stateless per request, batched (≤500 rows), idempotent
  (`idempotencyKey` unique + per-source/period/category duplicate check) and rate-limited
  per API key — it scales horizontally behind any load balancer; move the rate-limit map to Redis
  when running multiple instances.
- Pagination: every list route/page takes page/size; review queue and feed are capped at 30–100.
- When SQLite becomes the bottleneck, flip `provider` in `schema.prisma` to `postgresql` — the
  schema avoids SQLite-only types and Prisma generates a drop-in client.
- QA: a `data-quality score per contributor` is derivable by counting FLAGGED rows per createdById;
  contributors with many flagged submissions should be nudged to verified submission habits.

## API
- `POST /api/ingest` — header `x-api-key`, body `{idempotencyKey, readings[]}`. Returns
  `{created, skippedDuplicates, flagged}`. The same idempotencyKey is a no-op.
- `POST /api/readings`, `POST /api/commute` — manual forms.
- `POST /api/review` — facility admin approve/reject.
- `POST /api/import-csv` — column-mapped bulk import with per-row validation report.
- `POST /api/reports` — `{template, from, to, scopeType, format}` → PDF or Excel.
- `GET /api/certificate?userId=` — printable PDF certificate.
