import { createHash } from 'crypto'
import { prisma } from '../db'
import { buildEntry, verifyChain, type AuditEntryInput, type StoredAuditEntry } from './chain'

/** Append a new immutable audit entry. Never updates or deletes. */
export async function audit(input: AuditEntryInput) {
  const last = await prisma.auditLog.findFirst({ orderBy: { seq: 'desc' } })
  const prevHash = last?.hash ?? 'GENESIS'
  const seq = last ? last.seq + 1 : 1
  const built = buildEntry(prevHash, input)
  return prisma.auditLog.create({
    data: {
      seq,
      timestamp: built.timestamp,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      payload: JSON.stringify(input.payload ?? {}),
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      prevHash,
      hash: built.hash,
    },
  })
}

/** Load the full chain and re-verify every link. */
export async function verifyAuditChain(): Promise<
  { ok: true; length: number; tip: string } | { ok: false; brokenAt: number; reason: string }
> {
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } })
  const entries = rows.map((r) => ({
    seq: r.seq,
    timestamp: r.timestamp,
    actorId: r.actorId,
    actorRole: r.actorRole,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    payload: safeParse(r.payload),
    ip: r.ip,
    userAgent: r.userAgent,
    prevHash: r.prevHash,
    hash: r.hash,
  }))
  const res = verifyChain(entries as Array<StoredAuditEntry & { prevHash: string }>)
  if (res.ok) return { ok: true, length: res.length, tip: rows[rows.length - 1]?.hash ?? 'GENESIS' }
  return res
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

export function hashPayloadQuick(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
