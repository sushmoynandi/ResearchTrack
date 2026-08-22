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
      const supervisionCondition = {
        OR: [
          { assignedById: user.id },
          { student: { supervisorId: user.id } },
          {
            student: {
              labMemberships: {
                some: {
                  lab: {
                    OR: [
                      { leadId: user.id },
                      { members: { some: { userId: user.id } } },
                    ],
                  },
                },
              },
            },
          },
        ],
      }
      if (studentId) {
        where = {
          studentId,
          ...supervisionCondition,
        }
      } else {
        where = supervisionCondition
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

// POST /api/assignments — Create assignment for a student, a whole research lab, or a sub-group
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
    const { paperId, studentId, labId, groupId, targetType = 'STUDENT', dueDate, note } = body

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    // Verify paper exists (by ID or Slug)
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id: paperId }, { slug: paperId }],
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // ─── Case 1: Assign to Whole Research Lab ───
    if (targetType === 'LAB' || (labId && !studentId && !groupId)) {
      const lab = await prisma.lab.findUnique({
        where: { id: labId },
        include: {
          members: {
            include: { user: true },
          },
        },
      })

      if (!lab) {
        return NextResponse.json({ error: 'Research lab not found' }, { status: 404 })
      }

      // Find all student members in this lab
      const studentMembers = lab.members.filter((m) => m.user.systemRole === 'STUDENT')

      if (studentMembers.length === 0) {
        return NextResponse.json(
          { error: 'No student researchers found in this laboratory to assign' },
          { status: 400 }
        )
      }

      let assignedCount = 0
      for (const m of studentMembers) {
        const existing = await prisma.assignment.findUnique({
          where: {
            paperId_studentId: {
              paperId: paper.id,
              studentId: m.userId,
            },
          },
        })

        if (!existing) {
          await prisma.assignment.create({
            data: {
              paperId: paper.id,
              studentId: m.userId,
              assignedById: user.id,
              dueDate: dueDate ? new Date(dueDate) : null,
              note: note?.trim() || null,
              status: 'PENDING',
            },
          })
          assignedCount++

          // Send real-time notification
          await createNotification({
            userId: m.userId,
            title: `New Lab Paper Assigned (${lab.name})`,
            message: `${user.name} assigned "${paper.title}" to ${lab.name}.`,
            type: 'ASSIGNMENT',
            link: `/papers/${paper.slug || paper.id}`,
          }).catch(() => {})
        }
      }

      return NextResponse.json(
        {
          success: true,
          count: assignedCount,
          totalStudents: studentMembers.length,
          message: `Successfully assigned paper to ${assignedCount} students in "${lab.name}" (${studentMembers.length - assignedCount} already had it).`,
        },
        { status: 201 }
      )
    }

    // ─── Case 2: Assign to Sub-Group / Cluster ───
    if (targetType === 'GROUP' || (groupId && !studentId)) {
      const group = await prisma.researchGroup.findUnique({
        where: { id: groupId },
        include: {
          lab: true,
          members: {
            include: { user: true },
          },
        },
      })

      if (!group) {
        return NextResponse.json({ error: 'Sub-group not found' }, { status: 404 })
      }

      const studentMembers = group.members.filter((m) => m.user.systemRole === 'STUDENT')

      if (studentMembers.length === 0) {
        return NextResponse.json(
          { error: 'No student researchers found in this sub-group to assign' },
          { status: 400 }
        )
      }

      let assignedCount = 0
      for (const m of studentMembers) {
        const existing = await prisma.assignment.findUnique({
          where: {
            paperId_studentId: {
              paperId: paper.id,
              studentId: m.userId,
            },
          },
        })

        if (!existing) {
          await prisma.assignment.create({
            data: {
              paperId: paper.id,
              studentId: m.userId,
              assignedById: user.id,
              dueDate: dueDate ? new Date(dueDate) : null,
              note: note?.trim() || null,
              status: 'PENDING',
            },
          })
          assignedCount++

          // Send notification
          await createNotification({
            userId: m.userId,
            title: `New Sub-Group Paper Assigned (${group.name})`,
            message: `${user.name} assigned "${paper.title}" to sub-group ${group.name}.`,
            type: 'ASSIGNMENT',
            link: `/papers/${paper.slug || paper.id}`,
          }).catch(() => {})
        }
      }

      return NextResponse.json(
        {
          success: true,
          count: assignedCount,
          totalStudents: studentMembers.length,
          message: `Successfully assigned paper to ${assignedCount} students in sub-group "${group.name}".`,
        },
        { status: 201 }
      )
    }

    // ─── Case 3: Assign to Individual Student ───
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID, Lab ID, or Group ID is required' },
        { status: 400 }
      )
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify ownership check for supervisors
    if (user.systemRole === 'SUPERVISOR' && student.supervisorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only assign papers to students assigned to you by the administrator' },
        { status: 403 }
      )
    }

    // Check if assignment already exists
    const existing = await prisma.assignment.findUnique({
      where: {
        paperId_studentId: {
          paperId: paper.id,
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
        paperId: paper.id,
        studentId,
        assignedById: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        note: note?.trim() || null,
        status: 'PENDING',
      },
      include: {
        paper: { select: { id: true, slug: true, title: true, authors: true } },
        student: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    })

    // Send real-time notification to assigned student
    await createNotification({
      userId: studentId,
      title: 'New Paper Assigned',
      message: `${user.name} assigned you: "${paper.title}"`,
      type: 'ASSIGNMENT',
      link: `/papers/${paper.slug || paperId}`,
    }).catch(() => {})

    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create assignment' }, { status: 500 })
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
      include: { 
        paper: { select: { id: true, slug: true, title: true, authors: true } }, 
        student: true, 
        assignedBy: true 
      },
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
    if (status) {
      updateData.status = status
    }
    if (body.literatureReview !== undefined) {
      updateData.literatureReview = body.literatureReview
        ? typeof body.literatureReview === 'string'
          ? body.literatureReview
          : JSON.stringify(body.literatureReview)
        : null
    }
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
        paper: { select: { id: true, slug: true, title: true, authors: true } },
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
        link: `/papers/${assignment.paper.slug || assignment.paperId}`,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}
