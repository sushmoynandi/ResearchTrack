import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/assignments — Get assignments scoped to user role
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const studentId = searchParams.get('studentId') || ''

    let where: Record<string, unknown> = {}

    if (user.systemRole === 'ADMIN') {
      if (studentId) where.studentId = studentId
    } else if (user.systemRole === 'SUPERVISOR') {
      if (studentId) {
        where = { assignedById: user.id, studentId }
      } else {
        where = { assignedById: user.id }
      }
    } else {
      // Student: only my assignments
      where = { studentId: user.id }
    }

    if (status) {
      where.status = status
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            status: true,
            priority: true,
            journal: true,
            publicationYear: true,
            arxivId: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            institution: true,
            department: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// POST /api/assignments — Assign a paper to a student (Supervisor / Admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only Supervisors and Administrators can assign papers' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { paperId, studentId, dueDate, note } = body

    if (!paperId || !studentId) {
      return NextResponse.json(
        { error: 'Paper ID and Student ID are required' },
        { status: 400 }
      )
    }

    // Verify student exists and is a student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Check if assignment already exists
    const existing = await prisma.assignment.findUnique({
      where: {
        paperId_studentId: {
          paperId,
          studentId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This paper has already been assigned to this student' },
        { status: 409 }
      )
    }

    const assignment = await prisma.assignment.create({
      data: {
        paperId,
        studentId,
        assignedById: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        note: note?.trim() || null,
        status: 'PENDING',
      },
      include: {
        paper: { select: { id: true, title: true, authors: true } },
        student: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    })

    // Send real-time notification to assigned student
    await createNotification({
      userId: studentId,
      title: 'New Literature Assigned',
      message: `${user.name} assigned you: "${paper.title}"`,
      type: 'ASSIGNMENT',
      link: `/papers/${paperId}`,
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }
}

// PUT /api/assignments — Update assignment status or details
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, dueDate, note } = body

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { paper: true, student: true, assignedBy: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Permission check: Student can change status; Supervisor or Admin can change all
    const isStudent = assignment.studentId === user.id
    const isAssigner = assignment.assignedById === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isStudent && !isAssigner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (dueDate !== undefined && (isAssigner || isAdmin)) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }
    if (note !== undefined && (isAssigner || isAdmin)) {
      updateData.note = note?.trim() || null
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        paper: { select: { id: true, title: true, authors: true } },
        student: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    })

    // If student marked as completed, notify supervisor
    if (isStudent && status === 'COMPLETED') {
      await createNotification({
        userId: assignment.assignedById,
        title: 'Task Completed',
        message: `${user.name} completed assigned reading: "${assignment.paper.title}"`,
        type: 'STATUS_UPDATE',
        link: `/papers/${assignment.paperId}`,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}
