import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { audit } from '@/lib/audit/store'

const Body = z.object({ mode: z.string(), distanceKm: z.number().min(0).max(500), date: z.string().datetime() })

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid input' }, { status: 400 })
  const row = await prisma.commuteLog.create({ data: { userId: s.id, mode: parsed.data.mode, distanceKm: parsed.data.distanceKm, date: new Date(parsed.data.date) } })
  // points: small reward only for sustainable modes, capped (anti-gaming: volume doesn't pay)
  const sustainable = ['walk', 'cycle', 'bus', 'ev'].includes(parsed.data.mode)
  await prisma.pointsLedger.create({ data: { userId: s.id, points: sustainable ? 5 : 0, reason: sustainable ? 'sustainable commute' : 'logged commute (no points for car trips)', allowed: sustainable } })
  await audit({ actorId: s.id, actorRole: s.role, action: 'COMMUTE_LOG', entity: 'CommuteLog', entityId: row.id, payload: parsed.data })
  return NextResponse.json({ ok: true })
}
