import { NextResponse } from 'next/server'
import { destroySession, getSession } from '@/lib/auth/session'
import { audit } from '@/lib/audit/store'

export async function POST() {
  const s = await getSession()
  if (s) await audit({ actorId: s.id, actorRole: s.role, action: 'LOGOUT', payload: {} })
  await destroySession()
  return NextResponse.json({ ok: true })
}
