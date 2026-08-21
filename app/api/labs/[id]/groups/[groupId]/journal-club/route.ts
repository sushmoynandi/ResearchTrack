import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

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
    const { paperId, presenterId, scheduledAt, notes } = body

    if (!paperId || !presenterId || !scheduledAt) {
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
        presenterId,
        scheduledAt: new Date(scheduledAt),
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

    // Notify the assigned presenter
    await createNotification({
      userId: presenterId,
      title: 'Assigned as Journal Club Presenter 🎤',
      message: `You are scheduled to present "${session.paper.title}" for ${group.name} on ${new Date(scheduledAt).toLocaleDateString()}.`,
      type: 'ASSIGNMENT',
      link: `/papers/${session.paper.slug || paperId}/present`,
    })

    // Notify all other members
    for (const member of group.members) {
      if (member.userId !== presenterId && member.userId !== user.id) {
        await createNotification({
          userId: member.userId,
          title: `Upcoming Journal Club: ${group.name} 🗓️`,
          message: `${session.presenter.name} is presenting "${session.paper.title}" on ${new Date(scheduledAt).toLocaleDateString()}.`,
          type: 'SYSTEM',
          link: `/labs/${group.lab.slug}`,
        })
      }
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
