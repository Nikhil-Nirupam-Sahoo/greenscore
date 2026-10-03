import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { audit } from '@/lib/audit/store'

const Body = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid input' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'bad credentials' }, { status: 401 })
  }
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role })
  await audit({ actorId: user.id, actorRole: user.role, action: 'LOGIN', payload: { email: user.email } })
  return NextResponse.json({ ok: true, role: user.role })
}
