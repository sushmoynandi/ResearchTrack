import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/milestones — Fetch milestones for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId') || ''

    let where: Record<string, unknown> = {}

    if (user.systemRole === 'STUDENT') {
      where.studentId = user.id
    } else if (user.systemRole === 'SUPERVISOR') {
      where.supervisorId = user.id
      if (studentId) where.studentId = studentId
    } else {
      if (studentId) where.studentId = studentId
    }

    const milestones = await prisma.thesisMilestone.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, department: true } },
        supervisor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(milestones)
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
  }
}

// POST /api/milestones — Create a new thesis / research milestone
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, dueDate, studentId, supervisorId, collectionId } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
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
    }

    if (!targetStudentId || !targetSupervisorId) {
      return NextResponse.json(
        { error: 'Both student and supervisor must be assigned to create a thesis milestone' },
        { status: 400 }
      )
    }

    const milestone = await prisma.thesisMilestone.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        studentId: targetStudentId,
        supervisorId: targetSupervisorId,
        collectionId: collectionId || null,
        status: 'PENDING',
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        supervisor: { select: { id: true, name: true, email: true } },
      },
    })

    // Notify other party
    const notifyTarget = user.id === targetStudentId ? targetSupervisorId : targetStudentId
    await createNotification({
      userId: notifyTarget,
      title: 'New Research Milestone Set',
      message: `${user.name} established milestone: "${milestone.title}"`,
      type: 'ASSIGNMENT',
      link: '/milestones',
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}

// PUT /api/milestones — Submit deliverables or update milestone status
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, deliverableUrl, deliverableNotes, feedback } = body

    if (!id) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 })
    }

    const milestone = await prisma.thesisMilestone.findUnique({
      where: { id },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const isStudent = milestone.studentId === user.id
    const isSupervisor = milestone.supervisorId === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isStudent && !isSupervisor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (deliverableUrl !== undefined) updateData.deliverableUrl = deliverableUrl?.trim() || null
    if (deliverableNotes !== undefined) updateData.deliverableNotes = deliverableNotes?.trim() || null
    if (feedback !== undefined && (isSupervisor || isAdmin)) updateData.feedback = feedback?.trim() || null

    const updated = await prisma.thesisMilestone.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true, email: true } },
        supervisor: { select: { id: true, name: true, email: true } },
      },
    })

    // Send notifications on submission or approval
    if (isStudent && status === 'SUBMITTED') {
      await createNotification({
        userId: milestone.supervisorId,
        title: 'Deliverable Submitted',
        message: `${user.name} submitted deliverables for milestone: "${milestone.title}"`,
        type: 'STATUS_UPDATE',
        link: '/milestones',
      })
    } else if ((isSupervisor || isAdmin) && (status === 'APPROVED' || status === 'REVISION_REQUESTED')) {
      await createNotification({
        userId: milestone.studentId,
        title: status === 'APPROVED' ? 'Milestone Approved! 🎓' : 'Milestone Revision Requested',
        message: `${user.name} evaluated "${milestone.title}" (${status.replace('_', ' ')})`,
        type: 'FEEDBACK',
        link: '/milestones',
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating milestone:', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}
