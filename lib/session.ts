import { cookies, headers } from 'next/headers'
import { AUTH_COOKIE_NAME, verifySessionToken, SessionUser } from './auth'
import type { SystemRole } from './types'

export async function getCurrentUser(request?: Request): Promise<SessionUser | null> {
  let token: string | undefined

  // 1. Check Authorization header if request object provided
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
  }

  // 2. Check next/headers for Authorization header
  if (!token) {
    try {
      const headerStore = await headers()
      const authHeader = headerStore.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim()
      }
    } catch {
      // non-blocking
    }
  }

  // 3. Check cookies from next/headers
  if (!token) {
    try {
      const cookieStore = await cookies()
      const rawCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get('papertrack_session')?.value
      if (rawCookie && rawCookie.trim().length > 10) {
        token = rawCookie.trim()
      }
    } catch {
      // non-blocking
    }
  }

  // 4. Verify token if found
  if (token && token.length > 10) {
    const session = await verifySessionToken(token)
    if (session) return session
  }

  return null
}

export async function requireUser(request?: Request): Promise<SessionUser> {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require the current user to have one of the specified system roles.
 * Throws if not authenticated or role doesn't match.
 */
export async function requireRole(
  ...roles: SystemRole[]
): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.systemRole)) {
    throw new Error(`Forbidden: requires ${roles.join(' or ')} role`)
  }
  return user
}

/**
 * Check if the current user has supervisor-level access (SUPERVISOR or ADMIN).
 */
export async function requireSupervisorOrAdmin(): Promise<SessionUser> {
  return requireRole('SUPERVISOR', 'ADMIN')
}

/**
 * Check if the current user is an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('ADMIN')
}
