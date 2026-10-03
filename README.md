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

## Docs
- [docs/SCORING.md](docs/SCORING.md) — weighting, normalisation, benchmarks, CO₂e, improvement, missing-data rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layout, scaling plan, API surface
- [docs/DATA_INTEGRITY.md](docs/DATA_INTEGRITY.md) — hash chain, validation, flag queue
- [docs/IMPACT.md](docs/IMPACT.md) — why visibility + gamification cut real emissions
- `config/naac-template.json` — Criterion 7 mapping (verify metric IDs vs the official manual)
