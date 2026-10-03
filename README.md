# 🌿 GreenScore — Campus Sustainability Tracker & Auditor

One platform, four layers: **Data Capture**, **Scoring Engine**, **Gamification**, **Audit & Reporting**.

## Quick start

```bash
npm install        # also generates the prisma client
npm run db:push    # create the SQLite schema
npm run seed       # demo campus, users, 24 months of data, scores, feed
npm run dev        # http://localhost:3000
```

### Demo logins (password: `password123`)
| Role | Email | Sees |
|---|---|---|
| Admin | admin@greenscore.dev | campus score, hotspots, review queue, settings, reports |
| Facility staff | facility@greenscore.dev | meters to log, overdue readings, QR scan → log |
| Student | student@greenscore.dev | log commute, challenges, feed, points, impact |
| Staff | staff@greenscore.dev | student-style logging view |
| Auditor (read-only) | auditor@greenscore.dev | reports + audit integrity verification |

## The 5-minute judge walkthrough
1. Log in as **student@greenscore.dev** → Dashboard shows campus score 70/100, a
   "coverage" number (never a silent zero), and hotspots by kWh/person.
2. Go to **Log Data** → scan/pick a source (or use `/meters` to view printable QR codes) →
   pick a waste category emoji → save. One row exists in the review queue afterwards.
3. Log out, log in as **facility@greenscore.dev** → **Review Queue** → approve/reject a flagged meter
   reading. Flagged items are excluded from the score until approved.
4. Log in as **student@** again → **Log Data → Commute** → one tap "🚌" → points appear in
   **Feed** sidebar. Open **My Impact**: "X kg CO₂e avoided vs driving".
5. **Trends** → 24-month line charts + sub-score radar. **Leaderboard** → departments/hostels
   ranked per-capita, never raw volume.
6. Log in as **auditor@greenscore.dev** → **Integrity** → hash chain shows ✅ valid; run
   `npm run verify-audit` in a terminal to re-walk the chain yourself (tamper an `AuditLog`
   row and watch it fail).
7. **Reports** → pick NAAC Criterion 7 template, last 12 months, PDF → executive summary,
   methodology, CO₂e totals, coverage statement, audit tip hash, appendix. Also try Excel.
8. Optional: run `npm run simulate` to stream IoT readings into `/api/ingest`, then reload
   **Meters**/**Review Queue** to see new data arrive. Cron: `npm run rollup` to refresh
   monthly rollups, `npm run award-badges` to re-award streak badges.

## Key commands
| Command | Purpose |
|---|---|
| `npm run seed` | reset + load full demo dataset |
| `npm run dev` / `npm run build` | Next dev / production build |
| `npm run test` | vitest: scoring, audit chain, ingest idempotency, challenges |
| `npm run verify-audit` | CLI audit-chain integrity check (exit 1 on tampering) |
| `npm run simulate` | IoT meter simulator → POST /api/ingest |
| `npm run award-badges` | award streak/consistency badges from real data |
| `npm run db:push` | sync Prisma schema to SQLite |

## Run it as a web app (deploy / faster production mode)

### Option A — Docker (recommended, one command)
```bash
docker build -t greenscore .
docker run -p 3000:3000 -v greenscore-data:/app/prisma/data -e AUTH_SECRET=$(openssl rand -hex 32) greenscore
```
Open http://localhost:3000. The image pushes the schema, seeds demo data on first run
(SQLite persisted in the named volume at `/app/prisma/data`), and serves the fast
production build. Upload it to Render/Railway/Fly.io "from Dockerfile" to host it online.

### Option B — free Node hosting (Render / Railway)
- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npx prisma db push && npm run seed && npx next start -p 3000`
- Env vars: `AUTH_SECRET`, `DATABASE_URL` (SQLite path on a mounted disk, e.g.
  `file:./data/prod.db` — or switch `provider` to `postgresql` in `prisma/schema.prisma`
  and use the service's managed Postgres for serverless platforms).

### Option C — Vercel + managed Postgres
1. Create a free Postgres DB (Neon/Supabase), copy the connection string.
2. In `prisma/schema.prisma` set `provider = "postgresql"`.
3. In the Vercel project set env vars `DATABASE_URL` and `AUTH_SECRET`.
4. Deploy; locally run `npx prisma db push && npm run seed` once against that DB URL.

## Docs
- [docs/SCORING.md](docs/SCORING.md) — weighting, normalisation, benchmarks, CO₂e, improvement, missing-data rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layout, scaling plan, API surface
- [docs/DATA_INTEGRITY.md](docs/DATA_INTEGRITY.md) — hash chain, validation, flag queue
- [docs/IMPACT.md](docs/IMPACT.md) — why visibility + gamification cut real emissions
- `config/naac-template.json` — Criterion 7 mapping (verify metric IDs vs the official manual)
