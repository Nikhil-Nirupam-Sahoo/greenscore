import { createHash } from 'crypto'

export interface AuditEntryInput {
  actorId?: string | null
  actorRole?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  payload: unknown
  ip?: string | null
  userAgent?: string | null
  timestamp?: Date
}

export interface StoredAuditEntry extends AuditEntryInput {
  seq: number
  timestamp: Date
  prevHash: string
  hash: string
}

/** Canonical payload string for hashing — stable key order. */
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]))
  }
  return v
}
export function canonicalPayload(payload: unknown): string {
  return JSON.stringify(stable(payload))
}

export function entryHash(prevHash: string, e: AuditEntryInput & { timestamp: Date }): string {
  const s = [
    prevHash,
    e.actorId ?? '',
    e.actorRole ?? '',
    e.action,
    e.entity ?? '',
    e.entityId ?? '',
    e.timestamp.toISOString(),
    canonicalPayload(e.payload),
  ].join('|')
  return createHash('sha256').update(s).digest('hex')
}

/** Build a new entry continuing the chain. `prevHash` = hash of the last stored entry or 'GENESIS'. */
export function buildEntry(prevHash: string, input: AuditEntryInput): StoredAuditEntry & { prevHash: string } {
  const timestamp = input.timestamp ?? new Date()
  return {
    ...input,
    timestamp,
    seq: 0,
    prevHash,
    hash: entryHash(prevHash, { ...input, timestamp }),
  }
}

export type VerifyResult =
  | { ok: true; length: number }
  | { ok: false; brokenAt: number; reason: string }

/** Re-walk the chain and verify every hash links correctly. */
export function verifyChain(entries: Array<StoredAuditEntry & { prevHash: string }>): VerifyResult {
  let prev = 'GENESIS'
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.prevHash !== prev) {
      return { ok: false, brokenAt: i, reason: `prevHash mismatch (expected ${prev.slice(0, 12)}…, got ${String(e.prevHash).slice(0, 12)}…)` }
    }
    const h = entryHash(prev, {
      actorId: e.actorId,
      actorRole: e.actorRole,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      payload: e.payload,
      ip: e.ip,
      userAgent: e.userAgent,
      timestamp: e.timestamp,
    })
    if (h !== e.hash) return { ok: false, brokenAt: i, reason: 'hash mismatch (payload tampered)' }
    prev = e.hash
  }
  return { ok: true, length: entries.length }
}
