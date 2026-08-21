import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'

/**
 * POST /api/user/onboarding
 * One-step profile completion for accounts created via Google sign-in.
 * Lets a fresh Google user pick their role + institution + department —
 * the same choices the manual registration form offers.
 *
 * Gated to GOOGLE-provider accounts so it can't be used as a role-change
 * backdoor by password (CREDENTIALS) users.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.provider !== 'GOOGLE') {
      return NextResponse.json(
        { error: 'Profile completion is only available for Google sign-in accounts.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { systemRole, institution, department } = body

    const validRoles = ['STUDENT', 'SUPERVISOR']
    const assignedRole = validRoles.includes(systemRole) ? systemRole : 'STUDENT'

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        systemRole: assignedRole as 'STUDENT' | 'SUPERVISOR',
        role: assignedRole,
        institution: institution?.trim() || null,
        department: department?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        department: true,
        systemRole: true,
        image: true,
        isGuest: true,
        provider: true,
      },
    })

    // Re-issue the session so the new role is reflected everywhere immediately
    const sessionToken = await createSessionToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      systemRole: updatedUser.systemRole,
      institution: updatedUser.institution,
      department: updatedUser.department,
      image: updatedUser.image,
      isGuest: updatedUser.isGuest,
      provider: updatedUser.provider,
    })

    const cookieConfig = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    }

    const response = NextResponse.json({ success: true, user: updatedUser, token: sessionToken })
    response.cookies.set('researchtrack_session', sessionToken, cookieConfig)
    response.cookies.set('papertrack_session', sessionToken, cookieConfig)
    return response
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save your profile' }, { status: 500 })
  }
}
