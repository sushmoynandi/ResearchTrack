import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { SystemRole } from './types'

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'researchtrack-super-secret-jwt-key-2026-researcher'
const key = new TextEncoder().encode(JWT_SECRET_KEY)

export const AUTH_COOKIE_NAME = 'researchtrack_session'

export interface SessionUser {
  id: string
  email: string
  name: string
  systemRole: SystemRole
  institution?: string | null
  department?: string | null
  image?: string | null
  isGuest?: boolean
  provider?: string
}

export function getSessionCookieOptions(maxAgeDays = 30) {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      clockTolerance: 15,
    })
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function create2FAToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT({ ...payload, purpose: 'admin_2fa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key)
}

export async function verify2FAToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      clockTolerance: 15,
    })
    if (payload.purpose !== 'admin_2fa' || !payload.userId || !payload.email) return null
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}

