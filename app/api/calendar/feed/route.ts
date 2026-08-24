import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMultiEventIcs, CalendarEventParams } from '@/lib/calendarSync'

export const dynamic = 'force-dynamic'

// GET /api/calendar/feed?token=xxx — Live RFC 5545 WebCal / iCal Feed for Google Calendar & Apple Calendar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token || typeof token !== 'string') {
      return new NextResponse('Missing calendar feed token', { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { calendarFeedToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
      },
    })

    if (!user) {
      return new NextResponse('Invalid or expired calendar feed token', { status: 404 })
    }

    const events: CalendarEventParams[] = []

    // 1. Fetch 1-on-1 Advisor Meetings (both as student and supervisor)
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [{ studentId: user.id }, { supervisorId: user.id }],
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        actionItems: true,
        supervisorId: true,
        studentId: true,
        student: { select: { name: true, email: true } },
        supervisor: { select: { name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    for (const m of meetings) {
      const isSupervisor = user.id === m.supervisorId
      const counterpartName = isSupervisor ? m.student.name : m.supervisor.name
      const counterpartRole = isSupervisor ? 'Student Researcher' : 'Faculty Advisor'

      events.push({
        title: `🤝 ${m.title}`,
        description: [
          `Session: ${m.title}`,
          `With: ${counterpartName} (${counterpartRole})`,
          m.actionItems ? `\n📋 Agenda & Discussion Topics:\n${m.actionItems}` : '',
          `\n🏛️ ResearchTrack Workspace: ${request.nextUrl.origin}/meetings`,
        ]
          .filter(Boolean)
          .join('\n'),
        startDate: new Date(m.scheduledAt),
        endDate: new Date(new Date(m.scheduledAt).getTime() + 60 * 60 * 1000),
        location: '1-on-1 Research Check-in Hub',
        url: `${request.nextUrl.origin}/meetings`,
        attendeeEmail: user.email,
        alarms: [60, 30, 10], // 1 hour, 30 min, 10 min
      })
    }

    // 2. Fetch Supervisory Reading Deadlines (Assignments)
    const assignments = await prisma.assignment.findMany({
      where: {
        studentId: user.id,
        dueDate: { not: null },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        paper: { select: { id: true, slug: true, title: true, authors: true } },
        assignedBy: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    for (const a of assignments) {
      if (!a.dueDate) continue
      const paperUrl = `${request.nextUrl.origin}/papers/${a.paper.slug || a.paper.id}`
      events.push({
        title: `📖 Reading Deadline: ${a.paper.title}`,
        description: [
          `Supervisory Reading Sprint for: ${a.paper.title}`,
          `Authors: ${a.paper.authors}`,
          `Assigned by: ${a.assignedBy?.name || 'Faculty Advisor'}`,
          a.note ? `\n📝 Advisor Note: ${a.note}` : '',
          `\n📖 Paper Workspace: ${paperUrl}`,
        ]
          .filter(Boolean)
          .join('\n'),
        startDate: new Date(a.dueDate),
        endDate: new Date(new Date(a.dueDate).getTime() + 30 * 60 * 1000),
        location: 'ResearchTrack Paper Workspace',
        url: paperUrl,
        attendeeEmail: user.email,
        alarms: [60, 30, 10], // 1 hour, 30 min, 10 min
      })
    }

    // 3. Fetch Lab Meetings & Journal Clubs for user's labs/groups
    const userLabs = await prisma.labMember.findMany({
      where: { userId: user.id },
      select: { labId: true },
    })
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })

    const labIds = userLabs.map((l) => l.labId)
    const groupIds = userGroups.map((g) => g.groupId)

    // Lab Meetings
    if (labIds.length > 0) {
      const labMeetings = await prisma.labMeeting.findMany({
        where: {
          labId: { in: labIds },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          OR: [
            { groupId: null }, // lab wide
            { groupId: { in: groupIds } }, // user's subgroup
          ],
        },
        include: {
          host: { select: { name: true, email: true } },
          group: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
      })

      for (const lm of labMeetings) {
        const audienceScope = lm.group ? `Sub-Group Cluster (${lm.group.name})` : 'Lab-Wide Research Sync'
        events.push({
          title: `🔬 ${lm.title}`,
          description: [
            `Meeting: ${lm.title}`,
            `Audience & Scope: ${audienceScope}`,
            `Host: ${lm.host.name} (${lm.host.email})`,
            lm.meetingUrl ? `Join Link: ${lm.meetingUrl}` : '',
            lm.location ? `Location: ${lm.location}` : '',
            lm.description ? `Overview: ${lm.description}` : '',
            lm.agenda ? `\nAgenda & Discussion Topics:\n${lm.agenda}` : '',
            `\n🏛️ Lab Portal: ${request.nextUrl.origin}`,
          ]
            .filter(Boolean)
            .join('\n'),
          startDate: new Date(lm.startTime),
          endDate: lm.endTime ? new Date(lm.endTime) : new Date(new Date(lm.startTime).getTime() + 60 * 60 * 1000),
          location: lm.location || lm.meetingUrl || 'Virtual Lab Hub',
          url: lm.meetingUrl || undefined,
          attendeeEmail: user.email,
          alarms: [60, 30, 10], // 1 hour, 30 min, 10 min
        })
      }

      // Journal Club Sessions
      const journalClubSessions = await prisma.journalClubSession.findMany({
        where: {
          paper: { userId: user.id }, // or papers in user's scope
          status: 'SCHEDULED',
        },
        include: {
          paper: { select: { id: true, slug: true, title: true, authors: true } },
          presenter: { select: { name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      })

      for (const jc of journalClubSessions) {
        const slidesUrl = `${request.nextUrl.origin}/papers/${jc.paper.slug || jc.paper.id}/present`
        events.push({
          title: `🔬 Lab Journal Club: ${jc.paper.title}`,
          description: [
            `Paper Title: ${jc.paper.title}`,
            `Authors: ${jc.paper.authors}`,
            `Presenter: ${jc.presenter?.name || 'Lab Member'}`,
            jc.notes ? `\nSeminar Focus & Pre-reading Guidance:\n${jc.notes}` : '',
            `\n🖥️ Launch Presentation Slides: ${slidesUrl}`,
          ]
            .filter(Boolean)
            .join('\n'),
          startDate: new Date(jc.scheduledAt),
          endDate: new Date(new Date(jc.scheduledAt).getTime() + 60 * 60 * 1000),
          location: 'Lab Journal Club Seminar Room',
          url: slidesUrl,
          attendeeEmail: user.email,
          alarms: [60, 30, 10],
        })
      }
    }

    // Generate full RFC 5545 multi-event iCalendar with VALARM triggers
    const icsContent = generateMultiEventIcs(events, `${user.name}'s ResearchTrack Schedule`)

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="researchtrack-${user.id}.ics"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('Error generating calendar feed:', error)
    return new NextResponse('Failed to generate calendar feed', { status: 500 })
  }
}
