import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json({
      authenticated: true,
      user: { ...safeUser, hasPassword: Boolean(passwordHash) },
    })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 })
  }
}
