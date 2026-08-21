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

    const targetStudentId = searchParams.get('studentId')

    let whereCondition: Record<string, unknown> = { paperId }

    if (user.systemRole === 'STUDENT') {
      // Student strictly only sees feedback intended for them or authored by them
      whereCondition = {
        paperId,
        OR: [
          { targetUserId: user.id },
          { authorId: user.id },
        ],
      }
    } else if (targetStudentId) {
      // Supervisor inspecting a specific student
      whereCondition = {
        paperId,
        OR: [
          { targetUserId: targetStudentId },
          { authorId: targetStudentId },
          { targetUserId: paper.userId },
        ],
      }
    }

    const feedback = await prisma.feedback.findMany({
      where: whereCondition,
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
    const { paperId, content, type = 'COMMENT', targetUserId, studentId } = body

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

    const resolvedTargetId =
      targetUserId || studentId || paper.assignments[0]?.studentId || paper.userId

    const feedback = await prisma.feedback.create({
      data: {
        paperId,
        content: content.trim(),
        authorId: user.id,
        targetUserId: resolvedTargetId,
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

    // Send notification specifically to target student
    if (resolvedTargetId !== user.id) {
      await createNotification({
        userId: resolvedTargetId,
        title: 'New Feedback on Paper',
        message: `${user.name} left ${type.toLowerCase().replace('_', ' ')} on "${paper.title}"`,
        type: 'FEEDBACK',
        link: `/papers/${paper.slug || paperId}`,
      })
    }

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Failed to post feedback' }, { status: 500 })
  }
}
