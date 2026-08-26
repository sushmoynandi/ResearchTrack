import { cookies, headers } from 'next/headers'
import { AUTH_COOKIE_NAME, verifySessionToken, SessionUser } from './auth'
import { prisma } from './prisma'
import type { SystemRole } from './types'

export async function getCurrentUser(request?: Request): Promise<SessionUser | null> {
  const candidates: string[] = []

  const add = (value?: string | null) => {
    const token = value?.trim()
    if (token && token.length > 10 && !candidates.includes(token)) candidates.push(token)
  }

  // 1. Authorization header on the request object, if one was passed
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) add(authHeader.substring(7))
  }

  // 2. Authorization header via next/headers
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    if (authHeader?.startsWith('Bearer ')) add(authHeader.substring(7))
  } catch {
    // non-blocking
  }

  // 3. Session cookie
  try {
    const cookieStore = await cookies()
    add(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    add(cookieStore.get('papertrack_session')?.value)
  } catch {
    // non-blocking
  }

  // Every credential the request carried is tried, not just the first one
  // found. The browser sends both — a Bearer header from localStorage and the
  // session cookie — and the header used to win outright: if localStorage held
  // a token that no longer verified, the request was refused even though the
  // cookie beside it was perfectly good. Reloading the page then looked exactly
  // like being signed out. Each token is verified on its own, so accepting the
  // second one gives away nothing the first didn't already have to earn.
  for (const token of candidates) {
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
 *
 * The role is read from the database rather than the session cookie. A cookie
 * carries whatever the role was when it was issued and lives for 30 days, so
 * trusting it means a promotion doesn't take effect until the person signs out
 * and back in — and, worse, someone demoted keeps their old powers for a month.
 */
export async function requireRole(
  ...args: (SystemRole | Request | undefined)[]
): Promise<SessionUser> {
  const req = args.find((a): a is Request => a instanceof Request || (typeof a === 'object' && a !== null && 'headers' in a))
  const roles = args.filter((a): a is SystemRole => typeof a === 'string') as SystemRole[]

  const user = await requireUser(req)

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { systemRole: true, isActive: true },
  })

  if (!account || account.isActive === false) {
    throw new Error('Unauthorized')
  }

  if (roles.length > 0 && !roles.includes(account.systemRole as SystemRole)) {
    throw new Error(`Forbidden: requires ${roles.join(' or ')} role`)
  }

  // Hand back the role the database actually holds
  return { ...user, systemRole: account.systemRole as SystemRole }
}

/**
 * Check if the current user has supervisor-level access (SUPERVISOR or ADMIN).
 */
export async function requireSupervisorOrAdmin(request?: Request): Promise<SessionUser> {
  return requireRole(request, 'SUPERVISOR', 'ADMIN')
}

/**
 * Check if the current user is an admin.
 */
export async function requireAdmin(request?: Request): Promise<SessionUser> {
  return requireRole(request, 'ADMIN')
}
