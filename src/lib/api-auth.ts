import { NextResponse } from 'next/server'
import { getSession } from './auth/session'
import type { Role } from '@prisma/client'

export async function requireRole(roles: Role[]) {
  const s = await getSession()
  if (!s) return { error: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) }
  if (!roles.includes(s.role)) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { session: s }
}
