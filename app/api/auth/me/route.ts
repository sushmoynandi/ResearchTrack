import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth'

export async function GET() {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        institution: true,
        department: true,
        systemRole: true,
        provider: true,
        isGuest: true,
        isActive: true,
        supervisorId: true,
        createdAt: true,
        passwordHash: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorEmailReady: true,
        _count: {
          select: {
            papers: true,
            collections: true,
            notes: true,
            tags: true,
            students: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    // Never hand the hash to the client — just whether one exists, so the
    // Profile page can offer "Add password" instead of "Change password".
    const { passwordHash, ...safeUser } = user

    const response = NextResponse.json({
      authenticated: true,
      user: { ...safeUser, hasPassword: Boolean(passwordHash) },
    })

    // An admin may have changed this person's role since the session cookie was
    // issued (e.g. approving a role change request), and two-factor may have
    // been switched on or off in another tab. Re-issue the cookie here so the
    // gate in proxy.ts sees the truth on the next page load rather than after a
    // sign-out — otherwise an administrator who turns two-factor off keeps
    // browsing on a stale "it's on" flag.
    if (
      user.systemRole !== sessionUser.systemRole ||
      Boolean(user.twoFactorEnabled) !== Boolean(sessionUser.twoFactorEnabled)
    ) {
      const freshToken = await createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
        institution: user.institution,
        department: user.department,
        image: user.image,
        isGuest: user.isGuest,
        provider: user.provider,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      const cookieOptions = getSessionCookieOptions(30)
      response.cookies.set({ ...cookieOptions, value: freshToken })
      response.cookies.set({ ...cookieOptions, name: 'papertrack_session', value: freshToken })
    }

    return response
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 })
  }
}
