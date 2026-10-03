import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'

export const ReadingInput = z.object({
  value: z.number().finite().min(0).max(1e9),
  unit: z.string().min(1).max(20),
  category: z.enum(['electricity', 'water', 'waste', 'transport']),
  subCategory: z.string().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  method: z.enum(['MANUAL', 'IOT']).default('IOT'),
  evidencePhotoUrl: z.string().url().optional(),
})

export const IngestBatch = z.object({
  idempotencyKey: z.string().min(8).max(128),
  readings: z.array(ReadingInput).min(1).max(500),
})

export type IngestResult = { created: number; skippedDuplicates: number; flagged: number }

/** Idempotent ingest: same idempotencyKey or same source+period+category+subcategory is skipped, never duplicated. */
export async function ingestBatch(
  db: PrismaClient,
  source: { id: string; locationId: string; type: string },
  parsed: z.infer<typeof IngestBatch>,
): Promise<IngestResult> {
  const existing = await db.reading.findMany({ where: { idempotencyKey: parsed.idempotencyKey }, select: { id: true } })
  if (existing.length > 0) return { created: 0, skippedDuplicates: existing.length, flagged: 0 }

  let created = 0
  let flagged = 0
  for (const r of parsed.readings) {
    // duplicate detection against source history
    const dupe = await db.reading.findFirst({
      where: { sourceId: source.id, periodStart: new Date(r.periodStart), periodEnd: new Date(r.periodEnd), category: r.category, subCategory: r.subCategory ?? null },
      select: { id: true },
    })
    if (dupe) continue
    const history = await db.reading.findMany({
      where: { sourceId: source.id, category: r.category, subCategory: r.subCategory ?? null, status: 'VERIFIED' },
      orderBy: { periodStart: 'asc' }, take: 24, select: { value: true },
    })
    const jump = detectJump(history.map((h) => h.value), r.value)
    const row = await db.reading.create({
      data: {
        value: r.value, unit: r.unit, category: r.category, subCategory: r.subCategory ?? null,
        periodStart: new Date(r.periodStart), periodEnd: new Date(r.periodEnd),
        locationId: source.locationId, sourceId: source.id, method: r.method,
        status: jump ? 'FLAGGED' : 'PENDING', flagReason: jump ?? null,
        idempotencyKey: `${parsed.idempotencyKey}:${r.category}:${r.subCategory ?? ''}:${r.periodStart}`,
        evidencePhotoUrl: r.evidencePhotoUrl,
      },
    })
    created++
    if (row.status === 'FLAGGED') flagged++
  }
  return { created, skippedDuplicates: parsed.readings.length - created, flagged }
}

export function detectJump(history: number[], value: number): string | null {
  if (history.length < 3) return null
  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const sd = Math.sqrt(history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length) || 1
  const z = (value - mean) / sd
  if (Math.abs(z) > 4) return `statistical outlier (z=${z.toFixed(1)})`
  return null
}
