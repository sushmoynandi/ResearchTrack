import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { sendMeetingScheduledEmail } from '@/lib/email'
import { generateIcsContent, getGoogleCalendarUrl } from '@/lib/calendarSync'

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
    const { title, scheduledAt, studentId, supervisorId, studentNotes, supervisorNotes, topic, discussionTopic, actionItems } = body

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
        select: { supervisorId: true, systemRole: true },
      })
      if (!studentRecord || studentRecord.systemRole !== 'STUDENT') {
        return NextResponse.json({ error: 'Valid student recipient required' }, { status: 400 })
      }
      // If student does not have a supervisor assigned yet, automatically link to this supervisor
      if (!studentRecord.supervisorId) {
        await prisma.user.update({
          where: { id: targetStudentId },
          data: { supervisorId: user.id },
        })
      }
    }

    if (!targetStudentId || !targetSupervisorId) {
      return NextResponse.json(
        { error: 'Both student and supervisor must be assigned to schedule a 1-on-1 meeting' },
        { status: 400 }
      )
    }

    const effectiveSupervisorNotes = supervisorNotes?.trim() || topic?.trim() || discussionTopic?.trim() || null

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        studentId: targetStudentId,
        supervisorId: targetSupervisorId,
        studentNotes: studentNotes?.trim() || null,
        supervisorNotes: effectiveSupervisorNotes,
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
    const displayTime = body.formattedTime || new Date(scheduledAt).toLocaleDateString()
    const topicSnippet = effectiveSupervisorNotes ? ` (Topic: ${effectiveSupervisorNotes.slice(0, 50)}${effectiveSupervisorNotes.length > 50 ? '...' : ''})` : ''
    await createNotification({
      userId: notifyTarget,
      title: 'New 1-on-1 Meeting Scheduled 📅',
      message: `${user.name} scheduled a 1-on-1: "${meeting.title}" for ${displayTime}${topicSnippet}`,
      type: 'SYSTEM',
      link: '/meetings',
    })

    // Send mandatory email notification
    const recipient = user.id === targetStudentId ? meeting.supervisor : meeting.student
    const meetingUrl = `${request.nextUrl.origin}/meetings`
    const icalContent = generateIcsContent({
      title: meeting.title,
      description: [
        `Session: ${meeting.title}`,
        `Host / Supervisor: ${meeting.supervisor.name} (${meeting.supervisor.email})`,
        `Student Researcher: ${meeting.student.name} (${meeting.student.email})`,
        meeting.actionItems ? `\nAgenda & Discussion Topics:\n${meeting.actionItems}` : '',
        `\nMeeting Workspace: ${meetingUrl}`,
      ].filter(Boolean).join('\n'),
      startDate: meeting.scheduledAt,
      location: '1-on-1 Research Check-in Hub',
      url: meetingUrl,
      alarms: [60, 30, 10],
    })

    const googleCalUrl = getGoogleCalendarUrl({
      title: meeting.title,
      description: `1-on-1 Check-in with ${user.name}`,
      startDate: meeting.scheduledAt,
      url: meetingUrl,
      alarms: [60, 30, 10],
    })

    sendMeetingScheduledEmail({
      toEmail: recipient.email,
      recipientName: recipient.name,
      organizerName: user.name,
      meetingTitle: meeting.title,
      scheduledTimeFormatted: displayTime,
      actionItems: meeting.actionItems || undefined,
      meetingUrl,
      googleCalendarUrl: googleCalUrl,
      icalContent,
    }).catch(() => {})

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

    // Notify the other participant about reschedule, title edit, guidance notes, or status change
    const isRescheduled = scheduledAt !== undefined && new Date(scheduledAt).getTime() !== new Date(existing.scheduledAt).getTime()
    const isStatusChanged = status !== undefined && status !== existing.status
    const isTitleChanged = title !== undefined && title.trim() !== existing.title
    const isGuidanceUpdated = supervisorNotes !== undefined && supervisorNotes.trim() !== (existing.supervisorNotes || '')

    const notifyTarget = user.id === existing.studentId ? existing.supervisorId : existing.studentId

    if (isRescheduled) {
      const newTimeStr =
        body.formattedTime ||
        new Date(scheduledAt).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
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
    } else if (isTitleChanged || isGuidanceUpdated) {
      await createNotification({
        userId: notifyTarget,
        title: `Meeting Updated 📝`,
        message: `${user.name} updated the meeting details/guidance for "${updated.title}".`,
        type: 'SYSTEM',
        link: '/meetings',
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}
