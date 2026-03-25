import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'luca-updates-session-secret-2026'
)
const COOKIE_NAME = 'luca-session'

export interface SessionPayload {
  memberId: string
  firstName: string
  lastName: string
  email: string
  isAdmin: boolean
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return Promise.resolve(null)

  return jwtVerify(token, SECRET)
    .then(({ payload }) => payload as unknown as SessionPayload)
    .catch(() => null)
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
