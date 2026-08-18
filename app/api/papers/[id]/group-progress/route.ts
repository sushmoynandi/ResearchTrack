import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/group-progress — Get sub-group completion breakdown for this paper
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId } = await params

    const assignments = await prisma.assignment.findMany({
      where: { paperId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            groupMemberships: {
              include: { group: { select: { id: true, name: true, color: true } } },
            },
          },
        },
      },
    })

    const totalAssigned = assignments.length
    const completed = assignments.filter((a) => a.status === 'COMPLETED').length
    const inProgress = assignments.filter((a) => a.status === 'IN_PROGRESS').length
    const pending = assignments.filter((a) => a.status === 'PENDING').length
    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0

    return NextResponse.json({
      paperId,
      totalAssigned,
      completed,
      inProgress,
      pending,
      completionRate,
      roster: assignments.map((a) => ({
        assignmentId: a.id,
        studentId: a.student.id,
        name: a.student.name,
        email: a.student.email,
        status: a.status,
        dueDate: a.dueDate,
        groups: a.student.groupMemberships.map((gm) => gm.group),
      })),
    })
  } catch (error) {
    console.error('Error fetching paper group progress:', error)
    return NextResponse.json({ error: 'Failed to fetch group progress' }, { status: 500 })
  }
}

// POST /api/papers/[id]/group-progress — Send 1-click nudge to all pending readers of this paper
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: paperId } = await params
    const paper = await prisma.paper.findUnique({ where: { id: paperId } })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const pendingAssignments = await prisma.assignment.findMany({
      where: {
        paperId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: { student: true },
    })

    for (const a of pendingAssignments) {
      await createNotification({
        userId: a.studentId,
        title: 'Group Literature Reminder ⚡',
        message: `${user.name} sent a reminder to complete your reading for: "${paper.title}".`,
        type: 'ASSIGNMENT',
        link: `/papers/${paperId}`,
      })
    }

    return NextResponse.json({
      success: true,
      remindedCount: pendingAssignments.length,
    })
  } catch (error) {
    console.error('Error nudging group readers:', error)
    return NextResponse.json({ error: 'Failed to nudge group readers' }, { status: 500 })
  }
}
