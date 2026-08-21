import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const REQUESTABLE = ['STUDENT', 'SUPERVISOR'] as const
type RequestableRole = (typeof REQUESTABLE)[number]

/**
 * GET /api/user/role-request
 * The signed-in person's own role requests, newest first, so the Profile page
 * can show what's pending and what was decided.
 */
export async function GET() {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await prisma.roleChangeRequest.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      currentRole: true,
      requestedRole: true,
      reason: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(requests)
}

/**
 * POST /api/user/role-request
 * Ask an admin to move you between Student Researcher and Supervisor. Nobody
 * changes their own role — this only files the request.
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

    if (user.systemRole === 'ADMIN') {
      return NextResponse.json(
        { error: 'Administrators already have full access.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const requestedRole = body.requestedRole as RequestableRole
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!REQUESTABLE.includes(requestedRole)) {
      return NextResponse.json(
        { error: 'Pick either Student Researcher or Supervisor.' },
        { status: 400 }
      )
    }

    if (requestedRole === user.systemRole) {
      return NextResponse.json({ error: 'That is already your role.' }, { status: 400 })
    }

    // An admin needs something to go on before changing someone's role
    if (!reason) {
      return NextResponse.json(
        { error: 'Please say why you need this role.' },
        { status: 400 }
      )
    }

    const existing = await prisma.roleChangeRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You already have a request waiting for an admin.' },
        { status: 409 }
      )
    }

    const created = await prisma.roleChangeRequest.create({
      data: {
        userId: user.id,
        currentRole: user.systemRole,
        requestedRole,
        reason,
      },
    })

    // Let every admin know there's something to review
    const admins = await prisma.user.findMany({
      where: { systemRole: 'ADMIN', isActive: true },
      select: { id: true },
    })
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'Role change request',
          message: `${user.name} asked to become ${
            requestedRole === 'SUPERVISOR' ? 'a Supervisor' : 'a Student Researcher'
          }.`,
          type: 'SYSTEM' as const,
          link: '/admin/role-requests',
        })),
      })
    }

    return NextResponse.json({ success: true, request: created }, { status: 201 })
  } catch (error) {
    console.error('Role request error:', error)
    return NextResponse.json({ error: 'Could not send your request' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/role-request
 * Withdraw your own request while it's still waiting.
 */
export async function DELETE() {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.roleChangeRequest.deleteMany({
    where: { userId: sessionUser.id, status: 'PENDING' },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'You have no request waiting.' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
