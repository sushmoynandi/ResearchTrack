import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/role-requests/[id]
 * Approve or reject a role change. Approving is the only place a person's
 * systemRole changes on their behalf — done in a transaction with the request
 * so the two can never disagree.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const decision = body.decision as 'APPROVED' | 'REJECTED'
    const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : ''

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json({ error: 'Decision must be approve or reject' }, { status: 400 })
    }

    const roleRequest = await prisma.roleChangeRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, systemRole: true } } },
    })

    if (!roleRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (roleRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request was already decided.' }, { status: 409 })
    }

    const requestedRoleLabel =
      roleRequest.requestedRole === 'SUPERVISOR' ? 'Supervisor' : 'Student Researcher'

    await prisma.$transaction([
      prisma.roleChangeRequest.update({
        where: { id },
        data: {
          status: decision,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || null,
        },
      }),
      ...(decision === 'APPROVED'
        ? [
            prisma.user.update({
              where: { id: roleRequest.userId },
              data: {
                systemRole: roleRequest.requestedRole,
                role: roleRequest.requestedRole,
              },
            }),
          ]
        : []),
      prisma.notification.create({
        data: {
          userId: roleRequest.userId,
          title: decision === 'APPROVED' ? 'Role change approved' : 'Role change declined',
          message:
            decision === 'APPROVED'
              ? `You are now a ${requestedRoleLabel}.${reviewNote ? ` — ${reviewNote}` : ''}`
              : `Your request to become a ${requestedRoleLabel} was declined.${
                  reviewNote ? ` — ${reviewNote}` : ''
                }`,
          type: 'SYSTEM' as const,
          link: '/profile',
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: admin.id,
          userName: admin.name,
          action: decision === 'APPROVED' ? 'ROLE_CHANGE_APPROVED' : 'ROLE_CHANGE_REJECTED',
          resource: `user:${roleRequest.userId}`,
          details: `${roleRequest.user.name}: ${roleRequest.currentRole} → ${roleRequest.requestedRole}`,
          severity: decision === 'APPROVED' ? 'WARNING' : 'INFO',
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Role request decision error:', error)
    return NextResponse.json({ error: 'Could not save your decision' }, { status: 500 })
  }
}
