import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id]/meetings — List lab-wide and sub-group meetings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const scope = searchParams.get('scope') // 'labwide' | 'group' | 'all'
    const status = searchParams.get('status') // 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    const whereClause: any = {
      labId: lab.id,
      ...(status ? { status } : {}),
    }

    // For student researchers: Only allow lab-wide meetings OR meetings for sub-groups they are assigned to
    if (user.systemRole === 'STUDENT' && lab.leadId !== user.id) {
      const studentMemberships = await prisma.groupMember.findMany({
        where: {
          userId: user.id,
          group: { labId: lab.id },
        },
        select: { groupId: true },
      })

      const studentGroupIds = studentMemberships.map((m) => m.groupId)

      if (groupId) {
        if (!studentGroupIds.includes(groupId)) {
          return NextResponse.json([]) // Not member of this sub-group
        }
        whereClause.groupId = groupId
      } else {
        whereClause.OR = [
          { groupId: null },
          { groupId: { in: studentGroupIds } },
        ]
      }
    } else {
      if (groupId) {
        whereClause.groupId = groupId
      } else if (scope === 'labwide') {
        whereClause.groupId = null
      } else if (scope === 'group') {
        whereClause.groupId = { not: null }
      }
    }

    const meetings = await prisma.labMeeting.findMany({
      where: whereClause,
      include: {
        host: { select: { id: true, name: true, email: true, department: true } },
        group: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(meetings)
  } catch (error: any) {
    console.error('Error fetching lab meetings:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch lab meetings' }, { status: 500 })
  }
}

// POST /api/labs/[id]/meetings — Schedule a lab-wide or group-wise meeting
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const {
      title,
      description,
      groupId, // null/empty = Lab-wide meeting; string = Specific sub-group
      meetingType = 'LAB_WIDE',
      startTime,
      endTime,
      location,
      meetingUrl,
      agenda,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 })
    }

    if (!startTime) {
      return NextResponse.json({ error: 'Meeting start time is required' }, { status: 400 })
    }

    const parsedStartTime = new Date(startTime)
    if (isNaN(parsedStartTime.getTime())) {
      return NextResponse.json({ error: 'Invalid meeting start time' }, { status: 400 })
    }

    let parsedEndTime: Date | null = null
    if (endTime) {
      const parsed = new Date(endTime)
      if (!isNaN(parsed.getTime())) {
        parsedEndTime = parsed
      }
    }

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
      include: {
        members: true,
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    // Permission check: Must be lab lead, supervisor, admin, or co-lead
    const userMembership = lab.members.find((m) => m.userId === user.id)
    const isAuthorized =
      lab.leadId === user.id ||
      user.systemRole === 'SUPERVISOR' ||
      user.systemRole === 'ADMIN' ||
      userMembership?.role === 'LEAD' ||
      userMembership?.role === 'CO_LEAD'

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only faculty supervisors and lab leads can schedule meetings' },
        { status: 403 }
      )
    }

    let targetGroupName: string | null = null
    let targetUserIds: string[] = []

    if (groupId) {
      const group = await prisma.researchGroup.findUnique({
        where: { id: groupId },
        include: { members: true },
      })

      if (!group || group.labId !== lab.id) {
        return NextResponse.json({ error: 'Selected research group not found in this lab' }, { status: 404 })
      }

      targetGroupName = group.name
      targetUserIds = group.members.map((m) => m.userId)
    } else {
      // Lab-wide meeting
      targetUserIds = lab.members.map((m) => m.userId)
    }

    const meeting = await prisma.labMeeting.create({
      data: {
        labId: lab.id,
        groupId: groupId || null,
        hostId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        meetingType: groupId ? 'SUB_GROUP' : meetingType,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        location: location?.trim() || null,
        meetingUrl: meetingUrl?.trim() || null,
        agenda: agenda?.trim() || null,
        status: 'SCHEDULED',
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true, color: true } },
      },
    })

    // Dispatch notifications to all invited members
    const meetingDateStr =
      body.formattedTime ||
      parsedStartTime.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

    const notifTitle = groupId
      ? `Sub-Group Meeting Scheduled: ${targetGroupName} 📅`
      : `Lab-Wide Meeting Scheduled: ${lab.name} 🏛️`

    const notifMessage = `${user.name} scheduled meeting "${meeting.title}" on ${meetingDateStr}${
      meeting.location ? ` at ${meeting.location}` : ''
    }.`

    for (const memberId of targetUserIds) {
      if (memberId !== user.id) {
        await createNotification({
          userId: memberId,
          title: notifTitle,
          message: notifMessage,
          type: 'SYSTEM',
          link: `/labs/${lab.slug}`,
        })
      }
    }

    return NextResponse.json(meeting, { status: 201 })
  } catch (error: any) {
    console.error('Error scheduling lab meeting:', error)
    return NextResponse.json({ error: error.message || 'Failed to schedule meeting' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/meetings — Update meeting or status (COMPLETED, CANCELLED)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { meetingId, title, description, startTime, endTime, location, meetingUrl, agenda, status } = body

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    const meeting = await prisma.labMeeting.findUnique({
      where: { id: meetingId },
      include: { lab: true },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (meeting.hostId !== user.id && meeting.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (title) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (meetingUrl !== undefined) updateData.meetingUrl = meetingUrl?.trim() || null
    if (agenda !== undefined) updateData.agenda = agenda?.trim() || null
    if (status) updateData.status = status

    if (startTime) {
      const parsed = new Date(startTime)
      if (!isNaN(parsed.getTime())) updateData.startTime = parsed
    }
    if (endTime) {
      const parsed = new Date(endTime)
      if (!isNaN(parsed.getTime())) updateData.endTime = parsed
    }

    const updated = await prisma.labMeeting.update({
      where: { id: meetingId },
      data: updateData,
      include: {
        host: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true, color: true } },
        lab: { select: { id: true, name: true, slug: true, members: { select: { userId: true } } } },
      },
    })

    // Notify members about reschedule or status change
    const isRescheduled = startTime !== undefined
    const isStatusChanged = status !== undefined
    if (isRescheduled || isStatusChanged) {
      // Determine who to notify
      let targetUserIds: string[] = []
      if (updated.groupId) {
        const groupMembers = await prisma.groupMember.findMany({
          where: { groupId: updated.groupId },
          select: { userId: true },
        })
        targetUserIds = groupMembers.map((m) => m.userId)
      } else {
        targetUserIds = updated.lab.members.map((m) => m.userId)
      }

      const newTimeStr = isRescheduled
        ? body.formattedTime ||
          new Date(startTime).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : ''

      const notifTitle = isRescheduled
        ? `Meeting Rescheduled: "${updated.title}" 🔄`
        : `Meeting ${status}: "${updated.title}"`

      const notifMessage = isRescheduled
        ? `${user.name} rescheduled "${updated.title}" to ${newTimeStr}.`
        : `${user.name} marked "${updated.title}" as ${status}.`

      for (const memberId of targetUserIds) {
        if (memberId !== user.id) {
          await createNotification({
            userId: memberId,
            title: notifTitle,
            message: notifMessage,
            type: 'SYSTEM',
            link: `/labs/${updated.lab.slug}`,
          })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating meeting:', error)
    return NextResponse.json({ error: error.message || 'Failed to update meeting' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/meetings — Cancel / delete meeting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    const meeting = await prisma.labMeeting.findUnique({
      where: { id: meetingId },
      include: { lab: true },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (meeting.hostId !== user.id && meeting.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.labMeeting.delete({
      where: { id: meetingId },
    })

    return NextResponse.json({ success: true, message: 'Meeting cancelled' })
  } catch (error: any) {
    console.error('Error deleting meeting:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete meeting' }, { status: 500 })
  }
}
