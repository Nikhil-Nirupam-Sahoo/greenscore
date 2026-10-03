import { describe, it, expect } from 'vitest'
import { ingestBatch, IngestBatch, detectJump } from '../src/lib/ingest'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

describe('ingest', () => {
  it('validates payload shape', () => {
    expect(IngestBatch.safeParse({ idempotencyKey: 'short', readings: [] }).success).toBe(false)
    expect(IngestBatch.safeParse({ idempotencyKey: 'abcdefgh-1234', readings: [{ value: 5, unit: 'kWh', category: 'electricity', periodStart: new Date().toISOString(), periodEnd: new Date().toISOString() }] }).success).toBe(true)
    expect(IngestBatch.safeParse({ idempotencyKey: 'abcdefgh-1234', readings: [{ value: -5, unit: 'kWh', category: 'electricity', periodStart: new Date().toISOString(), periodEnd: new Date().toISOString() }] }).success).toBe(false)
  })

  it('detectJump flags only strong outliers with enough history', () => {
    expect(detectJump([100, 102, 98, 101, 99], 1000)).toMatch(/outlier/)
    expect(detectJump([100, 102, 98, 101, 99], 105)).toBeNull()
    expect(detectJump([100, 2000], 5000)).toBeNull() // <3 points: no verdict
  })

  it('is idempotent: replaying the same batch creates no duplicates', async () => {
    const source = await db.dataSource.findFirst({ where: { mode: 'IOT' } })
    if (!source) throw new Error('no iot source')
    const key = `test-${Date.now()}-idempotency`
    const payload = {
      idempotencyKey: key,
      readings: [{ value: 1234, unit: 'kWh', category: 'electricity' as const, periodStart: new Date('2030-01-01').toISOString(), periodEnd: new Date('2030-01-31').toISOString(), method: 'IOT' as const }],
    }
    const first = await ingestBatch(db, { id: source.id, locationId: source.locationId, type: source.type }, IngestBatch.parse(payload))
    const second = await ingestBatch(db, { id: source.id, locationId: source.locationId, type: source.type }, IngestBatch.parse(payload))
    expect(first.created).toBe(1)
    expect(second.created).toBe(0)
    await db.reading.deleteMany({ where: { idempotencyKey: { startsWith: key } } })
    await db.$disconnect()
  }, 20000)
})
