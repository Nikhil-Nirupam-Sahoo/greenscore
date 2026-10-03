import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { setWeights, getWeights } from '@/lib/settings'
import { validateWeights } from '@/lib/scoring/config'
import { audit } from '@/lib/audit/store'

export async function POST(req: Request) {
  const s = await getSession()
  if (!s || s.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const W = z.object({ energy: z.number().min(0), water: z.number().min(0), waste: z.number().min(0), transport: z.number().min(0) })
  const parsed = W.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !validateWeights(parsed.data)) {
    return NextResponse.json({ error: 'weights must be non-negative and sum to 100' }, { status: 400 })
  }
  await setWeights(parsed.data)
  await audit({ actorId: s.id, actorRole: s.role, action: 'SETTINGS_UPDATE', entity: 'Setting', entityId: 'weights', payload: parsed.data })
  return NextResponse.json({ ok: true, weights: await getWeights() })
}
