import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { audit } from '@/lib/audit/store'

const Body = z.object({
  sourceId: z.string(),
  value: z.number().finite().min(0),
  unit: z.string(),
  category: z.string(),
  subCategory: z.string().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  method: z.enum(['MANUAL', 'IOT']).default('MANUAL'),
  evidencePhotoUrl: z.string().optional(),
})

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid input', issues: parsed.error.issues }, { status: 400 })
  const src = await prisma.dataSource.findUnique({ where: { id: parsed.data.sourceId } })
  if (!src) return NextResponse.json({ error: 'unknown source' }, { status: 404 })
  const row = await prisma.reading.create({
    data: {
      value: parsed.data.value, unit: parsed.data.unit, category: parsed.data.category, subCategory: parsed.data.subCategory ?? null,
      periodStart: new Date(parsed.data.periodStart), periodEnd: new Date(parsed.data.periodEnd),
      locationId: src.locationId, sourceId: src.id, method: parsed.data.method,
      status: 'PENDING', createdById: s.id, evidencePhotoUrl: parsed.data.evidencePhotoUrl,
    },
  })
  await audit({ actorId: s.id, actorRole: s.role, action: 'READING_CREATE', entity: 'Reading', entityId: row.id, payload: parsed.data })
  return NextResponse.json({ ok: true, id: row.id })
}
