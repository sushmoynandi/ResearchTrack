import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { sendMeetingScheduledEmail } from '@/lib/email'
import { generateIcsContent, getGoogleCalendarUrl } from '@/lib/calendarSync'

interface RouteParams {
  params: Promise<{ id: string; groupId: string }>
}

// GET /api/labs/[id]/groups/[groupId]/journal-club — List scheduled journal club sessions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    if (user.systemRole === 'STUDENT') {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })

      const group = await prisma.researchGroup.findUnique({
        where: { id: groupId },
        include: { lab: true },
      })

      if (!membership && group?.lab.leadId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this research sub-group.' }, { status: 403 })
      }
    }

    const sessions = await prisma.journalClubSession.findMany({
      where: { groupId },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            journal: true,
            publicationYear: true,
            abstract: true,
            doi: true,
            url: true,
            replicationStatus: true,
            architecture: true,
            parameters: true,
            tags: { select: { id: true, name: true } },
          },
        },
        presenter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            systemRole: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching journal club sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch journal club sessions' }, { status: 500 })
  }
}

// POST /api/labs/[id]/groups/[groupId]/journal-club — Schedule a weekly seminar
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId, groupId } = await params
    const body = await request.json()
    const { paperId, presenterId, presenterIds, scheduledAt, notes, seminarScope = 'SEMINAR_GROUP', meetingUrl } = body

    const targetPresenterIds: string[] = Array.isArray(presenterIds) && presenterIds.length > 0
      ? presenterIds
      : [presenterId].filter(Boolean)

    const effectivePrimaryPresenterId = targetPresenterIds[0] || presenterId

    if (!paperId || !effectivePrimaryPresenterId || !scheduledAt) {
      return NextResponse.json({ error: 'Paper, Presenter, and Date are required' }, { status: 400 })
    }

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: { lab: true, members: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research group not found' }, { status: 404 })
    }

    const session = await prisma.journalClubSession.create({
      data: {
        groupId,
        paperId,
        presenterId: effectivePrimaryPresenterId,
        scheduledAt: new Date(scheduledAt),
        meetingUrl: meetingUrl?.trim() || null,
        notes: notes?.trim() || null,
        status: 'SCHEDULED',
      },
      include: {
        paper: {
          select: {
            id: true,
            slug: true,
            title: true,
            authors: true,
            journal: true,
            publicationYear: true,
            replicationStatus: true,
          },
        },
        presenter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
          },
        },
      },
    })

    // Fetch all designated presenters
    const presenters = await prisma.user.findMany({
      where: { id: { in: targetPresenterIds } },
      select: { id: true, name: true, email: true },
    })
    const presenterNames = presenters.length > 0
      ? presenters.map((p) => p.name).join(', ')
      : session.presenter.name

    // Notify all assigned presenters
    for (const pId of targetPresenterIds) {
      await createNotification({
        userId: pId,
        title: 'Assigned as Presentation Seminar Presenter 🎤',
        message: `You are scheduled as co-presenter for "${session.paper.title}" for ${group.name} on ${new Date(scheduledAt).toLocaleDateString()}.`,
        type: 'ASSIGNMENT',
        link: `/papers/${session.paper.slug || paperId}/present`,
      }).catch(() => {})
    }

    const groupUserIds = group.members.map((m) => m.userId)
    const groupUsers = await prisma.user.findMany({
      where: { id: { in: groupUserIds } },
      select: { id: true, name: true, email: true },
    })

    const slidesUrl = `${request.nextUrl.origin}/papers/${session.paper.slug || paperId}/present`
    const targetMeetingLink = session.meetingUrl || slidesUrl
    const dateFormatted = new Date(scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    
    let seminarTitlePrefix = '🎤 Lab Presentation Seminar'
    let targetLabOrGroupName = `${group.name} Seminar`
    if (seminarScope === 'SEMINAR_LAB') {
      seminarTitlePrefix = '🎤 Lab-Wide Presentation Seminar'
      targetLabOrGroupName = `${group.lab.name} Lab Seminar`
    } else if (seminarScope === 'SEMINAR_INDIVIDUAL') {
      seminarTitlePrefix = '🎤 Individual Presentation Seminar'
      targetLabOrGroupName = `Individual Presentation Seminar`
    }

    const icalContent = generateIcsContent({
      title: `${seminarTitlePrefix}: ${session.paper.title}`,
      description: [
        `Paper Title: ${session.paper.title}`,
        `Authors: ${session.paper.authors}`,
        `Presenters: ${presenterNames}`,
        session.meetingUrl ? `Meeting Link: ${session.meetingUrl}` : '',
        notes ? `\nSeminar Focus & Pre-reading Guidance:\n${notes}` : '',
        `\nLaunch Presentation Slides: ${slidesUrl}`,
      ].filter(Boolean).join('\n'),
      startDate: new Date(scheduledAt),
      location: session.meetingUrl || 'Lab Presentation Seminar Room',
      url: targetMeetingLink,
      alarms: [60, 30, 10],
    })

    const googleCalUrl = getGoogleCalendarUrl({
      title: `${seminarTitlePrefix}: ${session.paper.title}`,
      description: `Presenters: ${presenterNames}\nPaper: ${session.paper.title}${session.meetingUrl ? `\nMeeting Link: ${session.meetingUrl}` : ''}`,
      startDate: new Date(scheduledAt),
      location: session.meetingUrl || 'Lab Presentation Seminar Room',
      url: targetMeetingLink,
      alarms: [60, 30, 10],
    })

    for (const member of groupUsers) {
      if (member.id !== user.id && !targetPresenterIds.includes(member.id)) {
        await createNotification({
          userId: member.id,
          title: `Upcoming Presentation Seminar: ${group.name} 🗓️`,
          message: `${presenterNames} is presenting "${session.paper.title}" on ${dateFormatted}.`,
          type: 'SYSTEM',
          link: `/labs/${group.lab.slug}`,
        }).catch(() => {})
      }

      sendMeetingScheduledEmail({
        toEmail: member.email,
        recipientName: member.name,
        organizerName: user.name,
        presenterName: presenterNames,
        meetingTitle: session.paper.title,
        scheduledTimeFormatted: dateFormatted,
        actionItems: [
          session.meetingUrl ? `🔗 Virtual Meeting Link: ${session.meetingUrl}` : '',
          notes ? `\n📋 Seminar Focus & Guidance:\n${notes}` : '',
        ].filter(Boolean).join('\n') || undefined,
        meetingUrl: targetMeetingLink,
        googleCalendarUrl: googleCalUrl,
        icalContent,
        scopeType: seminarScope as any,
        labOrGroupName: targetLabOrGroupName,
      }).catch(() => {})
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error scheduling journal club session:', error)
    return NextResponse.json({ error: 'Failed to schedule journal club session' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/groups/[groupId]/journal-club — Update session status (COMPLETED, CANCELLED) or details
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, status, notes, scheduledAt, presenterId, paperId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt)
    if (presenterId) updateData.presenterId = presenterId
    if (paperId) updateData.paperId = paperId

    const updated = await prisma.journalClubSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            journal: true,
            publicationYear: true,
            replicationStatus: true,
          },
        },
        presenter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating journal club session:', error)
    return NextResponse.json({ error: 'Failed to update journal club session' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/groups/[groupId]/journal-club — Remove or cancel session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    await prisma.journalClubSession.delete({
      where: { id: sessionId },
    })

    return NextResponse.json({ success: true, message: 'Journal Club seminar removed' })
  } catch (error) {
    console.error('Error deleting journal club session:', error)
    return NextResponse.json({ error: 'Failed to delete journal club session' }, { status: 500 })
  }
}
