import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'

/**
 * POST /api/user/onboarding
 * The one-time profile step every new account goes through — Google and
 * email/password alike — where they pick their role + institution +
 * department. `proxy.ts` keeps them on /welcome until it's saved, so all
 * three values are mandatory here.
 *
 * Only accepted while the profile is still unfinished, so it can't be used as
 * a role-change backdoor later; changes after that go through /profile.
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

    if (user.institution?.trim() && user.department?.trim()) {
      return NextResponse.json(
        { error: 'Your profile is already set up. Edit it from the Profile page.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { systemRole, institution, department } = body

    // These are required — the whole app is gated behind them, so an empty
    // value here would leave the person stuck on the welcome screen.
    const cleanInstitution = typeof institution === 'string' ? institution.trim() : ''
    const cleanDepartment = typeof department === 'string' ? department.trim() : ''

    if (!cleanInstitution || !cleanDepartment) {
      return NextResponse.json(
        { error: 'Institution and department are both required' },
        { status: 400 }
      )
    }

    const validRoles = ['STUDENT', 'SUPERVISOR']
    const assignedRole = validRoles.includes(systemRole) ? systemRole : 'STUDENT'

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        systemRole: assignedRole as 'STUDENT' | 'SUPERVISOR',
        role: assignedRole,
        institution: cleanInstitution,
        department: cleanDepartment,
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
