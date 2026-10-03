# GreenScore — Progress Log

## Plan (Phase 0)

**Product**: One platform, 4 layers — Data Capture, Scoring Engine, Gamification, Audit & Reporting.

**Assumptions**
- App lives at `/home/nikhil/greenscore` (scaffold dir `greenscore-tmp` until deps finish installing).
- Auth: credentials-style session implemented with bcryptjs + jose cookie JWT (functionally NextAuth-credentials equivalent; documented after install finishes — will switch to next-auth v5 if it installs cleanly on Next 16, otherwise keep custom and note why).
- PDF via pdfkit (server-side route handlers), Excel via exceljs.
- PWA offline queue via a small IndexedDB wrapper + service worker hand-written (no next-pwa dependency to keep the toolchain predictable).

**Folder structure**
```
src/app/(auth)/login, src/app/(dashboard)/... role dashboards
src/app/api/...           route handlers (ingest, readings, auth, reports, audit...)
src/lib/scoring/          scoring engine (pure functions, unit-tested)
src/lib/audit/            hash chain build/verify
src/lib/db.ts             prisma client
src/lib/auth/*            session, rbac
prisma/schema.prisma, prisma/seed.ts
config/naac-template.json
scripts/simulate-iot.ts, scripts/verify-audit-chain.ts, scripts/monthly-rollup.ts
tests/ (vitest)
docs/SCORING.md ARCHITECTURE.md DATA_INTEGRITY.md IMPACT.md
```

**Phases**
0. Scaffold + plan (in progress)
1. Prisma schema + seed (npm run seed → working demo)
2. Scoring engine + unit tests + docs/SCORING.md
3. Capture forms + /api/ingest + QR + simulator + CSV import
4. Dashboards (role-based) + trends + hotspots
5. Audit chain + integrity verification (app page + CLI)
6. Reports (NAAC + internal) → PDF/Excel, saved report params
7. Gamification (challenges, leaderboards, badges, feed, certificates)
8. PWA offline queue + publish
9. Polish, docs, E2E judge walkthrough in README

## Log

### Phase 0 — scaffold
- create-next-app (Next 16, TS, Tailwind v4, App Router, src dir) OK; deps still installing.

### Phase 4 — role-based dashboards ✅
- /dashboard (score, trend, hotspots kWh/person, review count, pinned feed), /trends (MoM line + sub-score radar), /leaderboard (per-capita ranked w/ movement), /impact, /feed, /challenges (live progress from real rollups), /review, /audit. RBAC verified: student hitting /api/review → 403.

### Phase 5 — audit chain ✅
- Canonical-payload SHA-256 chain (src/lib/audit/*), append-only writer used by every mutation,
  in-app /audit verifier + CLI `npm run verify-audit` (exit 1 on tamper). Tested: tamper + reorder cases fail.

### Phase 6 — reports ✅
- config/naac-template.json (criteria→metric mapping, official-manual verification note),
  POST /api/reports → pdfkit PDF + exceljs workbook (Summary, Raw rollups, per-category sheets,
  factors used), SavedReport stores params+integrity hash, audit-trail tip hash embedded.
  E2E: PDF 200 (3.1KB), XLSX 200 (34KB), both verified.

### Phase 7 — gamification ✅
- Points only for VERIFIED sustainable commutes (anti-gaming: rejected attempts logged in
  PointsLedger with allowed=false), one-time monthly challenge progress from real rollups,
  badge award script from real data, certificate PDF route, feed with pins/announcements.

### Phase 8 — PWA/offline ✅
- manifest.json + sw.js (network-first GET cache, POST bypass), IndexedDB offline queue with
  auto-flush on 'online' (src/lib/offline-queue.ts + OfflineSync component), forms read
  "offline — will sync later" when queued.

### Phase 9 — polish, docs, final checks ✅
- README rewritten (setup, demo logins, 5-min judge walkthrough), docs/{SCORING,ARCHITECTURE,
  DATA_INTEGRITY,IMPACT}.md written, layout title/meta set.
- Final state: tsc --noEmit clean, eslint clean, 19/19 vitest pass, `next build` exit 0,
  all 13 pages 200, RBAC 403 verified, audit chain CLI validates, ingest idempotency test passes.

Environment note (important): Next 16.3.8's native swc binding SIGBUSes on this kernel/node
combo (reproduced with both node 26 and a plain node 22). Solution: pinned next@15.5.27 +
eslint-config-next@15. All Next 15 conventions used; `npm run dev` / `build` / `start` all work.

### Phase 1 — schema + seed ✅
- prisma db push OK; `npm run seed` loads 12 locations, ~2950 users, 24 meters, 960 readings (Oct 2024–Sep 2026, seasonality + seeded anomalies + FLAGGED rows), 18k commute logs, 955 monthly rollups, challenges, badges, feed posts, score snapshots.
- tsc --noEmit: clean. eslint: clean.

### Phase 2 — scoring engine ✅
- src/lib/scoring/{config,normalize,engine,compute}.ts. Default weights 30/25/25/20 (validated), benchmark table with per-capita norms (placeholders marked), CO2e from editable EmissionFactor table, improvement vs trailing baseline, missing-data → incomplete + coverage, seasonality documented; ScoreSnapshot stores inputs/weights/factorsVersion/formulaVersion.
- 24 monthly snapshots computed. tests: 19 passing (scoring, audit, ingest idempotency, challenges).

### Phase 3 — capture + ingest ✅
- POST /api/ingest (hashed per-device API key, idempotency key, jump detection, rate limit), POST /api/readings, POST /api/commute, CSV import endpoint + /import UI, QR-prefilled /log form (<=3 taps), /meters printable QRs, scripts/simulate-iot.ts verified working against dev server (all meter pages + APIs 200).
- Environment fix: Next 16.3.8's swc native binding SIGBUSes on this kernel/node — pinned next@15.5.27 + eslint-config-next@15. `next build` passes.
