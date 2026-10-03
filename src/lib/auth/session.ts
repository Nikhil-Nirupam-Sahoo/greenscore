import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Role } from '@prisma/client'

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'greenscore-dev-secret-change-me')
const COOKIE = 'gs_session'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
  const jar = await cookies()
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { id: payload.sub!, email: payload.email as string, name: payload.name as string, role: payload.role as Role }
  } catch {
    return null
  }
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export function roleAllowed(role: Role, allowed: Role[]) {
  return allowed.includes(role)
}
