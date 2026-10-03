# Data Integrity & the Audit Trail

## Immutable audit log (hash chain)
Every mutation (login, reading creation, ingest, review decision, report, seed) is appended to
`AuditLog` with:
```
hash = SHA-256(prevHash | actorId | actorRole | action | entity | entityId | timestamp | canonicalPayload)
```
`prevHash` is the hash of the previous entry; the first entry's `prevHash` is `GENESIS`.
There are no update/delete paths — corrections are new rows that reference the original.
Verification:
- In app: `/audit` page (auditor role) re-walks the whole chain and reports the first break.
- CLI: `npm run verify-audit` exits non-zero on tampering — re-runs the same check.
`payload` is canonicalised (sorted keys, recursively) before hashing so equivalent edits are detected.

## Capture safeguards
- Zod validation on every API input (types, ranges, required fields).
- Cumulative meter values must be non-decreasing; sudden jumps >4σ vs the meter's history are
  FLAGGED and held out of scoring until a facility admin approves (review queue at /review).
- Duplicate detection: same source+period+category+subCategory is skipped, never double-counted.
- IoT keys are stored as SHA-256 hashes (raw key only shown once in the simulator docs).
- Photo evidence: `Reading.evidencePhotoUrl` for meter-photo verification.

## Quality & trust in the score
- `MonthlyRollup.coverage` = share of a period's readings that are VERIFIED.
- ScoreSnapshot stores `coverage`, `incomplete` flag, plus inputs/weights/factors hash — the score
  always publishes its own confidence.
- Points/badges only ever derive from VERIFIED data (anti-gaming); PointsLedger keeps rejected
  attempts with `allowed=false` for inspection.
