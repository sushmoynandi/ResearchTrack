import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/feedback?paperId=xyz — Fetch feedback on a paper
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        user: { select: { supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (paper.userId === user.id ||
        paper.user.supervisorId === user.id ||
        paper.assignments.some((assignment) => assignment.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !paper.assignments.some((assignment) => assignment.studentId === user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const feedback = await prisma.feedback.findMany({
      where: { paperId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            systemRole: true,
            institution: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// POST /api/feedback — Post feedback on a paper (Supervisor / Admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paperId, content, type = 'COMMENT' } = body

    if (!paperId || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'Paper ID and content are required' },
        { status: 400 }
      )
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only supervisors and administrators can post feedback' },
        { status: 403 }
      )
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        user: { select: { supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (paper.userId === user.id ||
        paper.user.supervisorId === user.id ||
        paper.assignments.some((assignment) => assignment.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const feedback = await prisma.feedback.create({
      data: {
        paperId,
        content: content.trim(),
        authorId: user.id,
        targetUserId: paper.userId,
        type: type || 'COMMENT',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            systemRole: true,
          },
        },
      },
    })

    // Feedback on a supervisor-owned paper belongs to the shared assignment,
    // so notify every assigned student rather than only the paper owner.
    const notificationRecipients = new Set(
      paper.assignments.length > 0
        ? paper.assignments.map((assignment) => assignment.studentId)
        : [paper.userId]
    )

    await Promise.all(
      [...notificationRecipients]
        .filter((recipientId) => recipientId !== user.id)
        .map((recipientId) =>
          createNotification({
            userId: recipientId,
            title: 'New Feedback on Paper',
            message: `${user.name} left ${type.toLowerCase().replace('_', ' ')} on "${paper.title}"`,
            type: 'FEEDBACK',
            link: `/papers/${paper.slug || paperId}`,
          })
        )
    )

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Failed to post feedback' }, { status: 500 })
  }
}
