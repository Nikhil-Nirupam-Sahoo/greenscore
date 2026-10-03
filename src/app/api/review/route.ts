import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { audit } from '@/lib/audit/store'

export async function POST(req: Request) {
  const s = await getSession()
  if (!s || (s.role !== 'ADMIN' && s.role !== 'FACILITY_STAFF')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const Body = z.object({ id: z.string(), action: z.enum(['approve', 'reject']) })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const r = await prisma.reading.update({
    where: { id: parsed.data.id },
    data: parsed.data.action === 'approve' ? { status: 'VERIFIED', flagReason: null } : { status: 'FLAGGED', flagReason: 'rejected by reviewer' },
  })
  await audit({ actorId: s.id, actorRole: s.role, action: `READING_${parsed.data.action.toUpperCase()}`, entity: 'Reading', entityId: r.id, payload: { before: r.status } })
  return NextResponse.json({ ok: true })
}
