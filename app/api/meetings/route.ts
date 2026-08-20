import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/meetings — Fetch 1-on-1 meetings for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''

    let where: Record<string, unknown> = {}

    if (user.systemRole === 'SUPERVISOR') {
      where.supervisorId = user.id
    } else if (user.systemRole === 'STUDENT') {
      where.studentId = user.id
    } else {
      // Admin sees all
    }

    if (status) {
      where.status = status
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, image: true, department: true },
        },
        supervisor: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    return NextResponse.json(meetings)
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

// POST /api/meetings — Schedule a new 1-on-1 meeting
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, scheduledAt, studentId, supervisorId, studentNotes, supervisorNotes, actionItems } = body

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: 'Title and scheduled time are required' }, { status: 400 })
    }

    let targetStudentId = studentId
    let targetSupervisorId = supervisorId

    if (user.systemRole === 'STUDENT') {
      targetStudentId = user.id
      if (!targetSupervisorId) {
        const studentRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { supervisorId: true },
        })
        targetSupervisorId = studentRecord?.supervisorId || undefined
      }
    } else if (user.systemRole === 'SUPERVISOR') {
      targetSupervisorId = user.id
      const studentRecord = await prisma.user.findUnique({
        where: { id: targetStudentId },
        select: { supervisorId: true },
      })
      if (studentRecord?.supervisorId !== user.id) {
        return NextResponse.json(
          { error: 'You can only schedule 1-on-1 meetings with students assigned to you by an administrator' },
          { status: 403 }
        )
      }
    }

    if (!targetStudentId || !targetSupervisorId) {
      return NextResponse.json(
        { error: 'Both student and supervisor must be assigned to schedule a 1-on-1 meeting' },
        { status: 400 }
      )
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        studentId: targetStudentId,
        supervisorId: targetSupervisorId,
        studentNotes: studentNotes?.trim() || null,
        supervisorNotes: supervisorNotes?.trim() || null,
        actionItems: actionItems ? (typeof actionItems === 'string' ? actionItems : JSON.stringify(actionItems)) : null,
        status: 'SCHEDULED',
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        supervisor: { select: { id: true, name: true, email: true } },
      },
    })

    // Notify other participant
    const notifyTarget = user.id === targetStudentId ? targetSupervisorId : targetStudentId
    await createNotification({
      userId: notifyTarget,
      title: 'New 1-on-1 Meeting Scheduled',
      message: `${user.name} scheduled a 1-on-1: "${meeting.title}" for ${new Date(scheduledAt).toLocaleDateString()}`,
      type: 'SYSTEM',
      link: '/meetings',
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json({ error: 'Failed to schedule meeting' }, { status: 500 })
  }
}

// PUT /api/meetings — Update notes, action items, or meeting status
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, scheduledAt, status, studentNotes, supervisorNotes, actionItems } = body

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    const existing = await prisma.meeting.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Permission check
    const isParticipant = existing.studentId === user.id || existing.supervisorId === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title.trim()
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt)
    if (status !== undefined) updateData.status = status
    if (studentNotes !== undefined) updateData.studentNotes = studentNotes?.trim() || null
    if (supervisorNotes !== undefined) updateData.supervisorNotes = supervisorNotes?.trim() || null
    if (actionItems !== undefined) {
      updateData.actionItems = typeof actionItems === 'string' ? actionItems : JSON.stringify(actionItems)
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true, email: true } },
        supervisor: { select: { id: true, name: true, email: true } },
      },
    })

    // Notify the other participant about reschedule or status change
    const isRescheduled = scheduledAt !== undefined
    const isStatusChanged = status !== undefined
    if (isRescheduled || isStatusChanged) {
      const notifyTarget = user.id === existing.studentId ? existing.supervisorId : existing.studentId

      if (isRescheduled) {
        const newTimeStr = new Date(scheduledAt).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        await createNotification({
          userId: notifyTarget,
          title: `Meeting Rescheduled 🔄`,
          message: `${user.name} rescheduled "${updated.title}" to ${newTimeStr}.`,
          type: 'SYSTEM',
          link: '/meetings',
        })
      } else if (isStatusChanged) {
        await createNotification({
          userId: notifyTarget,
          title: `Meeting ${status}: "${updated.title}"`,
          message: `${user.name} marked your 1-on-1 meeting as ${status}.`,
          type: 'SYSTEM',
          link: '/meetings',
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}
