import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { IngestBatch, ingestBatch } from '@/lib/ingest'
import { createHash } from 'crypto'
import { audit } from '@/lib/audit/store'

const buckets = new Map<string, { count: number; reset: number }>()

export async function POST(req: Request) {
  // rate limit: 60 req/min per key
  const key = req.headers.get('x-api-key') ?? 'anon'
  const now = Date.now()
  const b = buckets.get(key)
  if (b && b.reset > now) {
    if (b.count >= 60) return NextResponse.json({ error: 'rate limited' }, { status: 429 })
    b.count++
  } else buckets.set(key, { count: 1, reset: now + 60000 })

  if (!key || key === 'anon') return NextResponse.json({ error: 'missing x-api-key' }, { status: 401 })
  const hash = createHash('sha256').update(key).digest('hex')
  const source = await prisma.dataSource.findFirst({ where: { apiKeyHash: hash } })
  if (!source) return NextResponse.json({ error: 'invalid api key' }, { status: 403 })

  const parsed = IngestBatch.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid payload', issues: parsed.error.issues }, { status: 400 })

  const result = await ingestBatch(prisma, { id: source.id, locationId: source.locationId, type: source.type }, parsed.data)
  await audit({ actorId: source.id, actorRole: 'IOT_DEVICE', action: 'INGEST', entity: 'DataSource', entityId: source.id, payload: { idempotencyKey: parsed.data.idempotencyKey, ...result } })
  return NextResponse.json({ ok: true, ...result })
}
