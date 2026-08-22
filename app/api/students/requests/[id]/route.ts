import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/students/requests/[id] — Student accepts or rejects a supervision invitation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body // 'ACCEPT' | 'REJECT'

    if (!action || (action !== 'ACCEPT' && action !== 'REJECT')) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'ACCEPT' or 'REJECT'" },
        { status: 400 }
      )
    }

    const supervisionRequest = await prisma.supervisionRequest.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!supervisionRequest) {
      return NextResponse.json({ error: 'Supervision request not found' }, { status: 404 })
    }

    // Only the target student can accept or reject the invitation
    if (supervisionRequest.studentId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to respond to this invitation' },
        { status: 403 }
      )
    }

    if (action === 'ACCEPT') {
      // 1. Mark request as APPROVED
      const updatedRequest = await prisma.supervisionRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      })

      // 2. Link student to supervisor
      await prisma.user.update({
        where: { id: supervisionRequest.studentId },
        data: { supervisorId: supervisionRequest.supervisorId },
      })

      // 3. Notify supervisor
      await createNotification({
        userId: supervisionRequest.supervisorId,
        title: '🎓 Supervision Invitation Accepted!',
        message: `${user.name} accepted your research supervision invitation and joined your active student roster.`,
        type: 'SYSTEM',
        link: '/students',
      })

      return NextResponse.json({
        success: true,
        status: 'APPROVED',
        message: `You are now supervised by ${supervisionRequest.supervisor.name}!`,
        request: updatedRequest,
      })
    } else {
      // 1. Mark request as REJECTED
      const updatedRequest = await prisma.supervisionRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
      })

      // 2. Notify supervisor
      await createNotification({
        userId: supervisionRequest.supervisorId,
        title: 'Supervision Invitation Declined',
        message: `${user.name} declined the research supervision invitation.`,
        type: 'SYSTEM',
        link: '/students',
      })

      return NextResponse.json({
        success: true,
        status: 'REJECTED',
        message: 'Supervision invitation declined.',
        request: updatedRequest,
      })
    }
  } catch (error: any) {
    console.error('Error responding to supervision request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// DELETE /api/students/requests/[id] — Supervisor cancels a pending invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supervisionRequest = await prisma.supervisionRequest.findUnique({
      where: { id },
    })

    if (!supervisionRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Must be the supervisor who created it or an admin
    if (supervisionRequest.supervisorId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.supervisionRequest.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Invitation canceled' })
  } catch (error: any) {
    console.error('Error canceling supervision request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}
