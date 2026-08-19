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
    const {
      title,
      description,
      dueDate,
      targetType = 'INDIVIDUAL',
      studentId,
      supervisorId,
      labId,
      groupId,
      collectionId,
    } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    // ─── 1. Lab-Wide Milestone Assignment ───────────────────────
    if (targetType === 'LAB' && labId) {
      const lab = await prisma.lab.findUnique({
        where: { id: labId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, systemRole: true } },
            },
          },
        },
      })

      if (!lab) {
        return NextResponse.json({ error: 'Research Lab not found' }, { status: 404 })
      }

      // Collect all student/researcher members (excluding the supervisor)
      const targetUserIds = lab.members
        .map((m) => m.userId)
        .filter((uid) => uid !== user.id)

      const finalUserIds = targetUserIds.length > 0 ? targetUserIds : [user.id]

      const createdMilestones = await Promise.all(
        finalUserIds.map(async (stId) => {
          const m = await prisma.thesisMilestone.create({
            data: {
              title: title.trim(),
              description: description.trim(),
              dueDate: dueDate ? new Date(dueDate) : null,
              studentId: stId,
              supervisorId: user.id,
              collectionId: collectionId || null,
              status: 'PENDING',
            },
            include: {
              student: { select: { id: true, name: true, email: true } },
              supervisor: { select: { id: true, name: true, email: true } },
            },
          })

          if (stId !== user.id) {
            try {
              await createNotification({
                userId: stId,
                title: `🏛️ New Lab Milestone: ${lab.name}`,
                message: `${user.name} assigned a lab-wide milestone: "${milestoneTitle(title)}"`,
                type: 'ASSIGNMENT',
                link: '/milestones',
              })
            } catch {
              // non-blocking
            }
          }
          return m
        })
      )

      return NextResponse.json(
        {
          success: true,
          count: createdMilestones.length,
          milestones: createdMilestones,
          firstMilestone: createdMilestones[0],
        },
        { status: 201 }
      )
    }

    // ─── 2. Sub-Group Milestone Assignment ───────────────────────
    if (targetType === 'GROUP' && groupId) {
      const group = await prisma.researchGroup.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          lab: { select: { name: true } },
        },
      })

      if (!group) {
        return NextResponse.json({ error: 'Research Group not found' }, { status: 404 })
      }

      const targetUserIds = group.members
        .map((m) => m.userId)
        .filter((uid) => uid !== user.id)

      const finalUserIds = targetUserIds.length > 0 ? targetUserIds : [user.id]

      const createdMilestones = await Promise.all(
        finalUserIds.map(async (stId) => {
          const m = await prisma.thesisMilestone.create({
            data: {
              title: title.trim(),
              description: description.trim(),
              dueDate: dueDate ? new Date(dueDate) : null,
              studentId: stId,
              supervisorId: user.id,
              collectionId: collectionId || null,
              status: 'PENDING',
            },
            include: {
              student: { select: { id: true, name: true, email: true } },
              supervisor: { select: { id: true, name: true, email: true } },
            },
          })

          if (stId !== user.id) {
            try {
              await createNotification({
                userId: stId,
                title: `🔬 New Sub-Group Milestone: ${group.name}`,
                message: `${user.name} assigned a sub-group milestone: "${milestoneTitle(title)}"`,
                type: 'ASSIGNMENT',
                link: '/milestones',
              })
            } catch {
              // non-blocking
            }
          }
          return m
        })
      )

      return NextResponse.json(
        {
          success: true,
          count: createdMilestones.length,
          milestones: createdMilestones,
          firstMilestone: createdMilestones[0],
        },
        { status: 201 }
      )
    }

    // ─── 3. Individual Student Milestone Assignment ──────────────
    let targetStudentId = studentId ? String(studentId).trim() : ''
    let targetSupervisorId = supervisorId ? String(supervisorId).trim() : ''

    if (user.systemRole === 'STUDENT') {
      targetStudentId = user.id
      if (!targetSupervisorId) {
        const studentRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { supervisorId: true },
        })
        targetSupervisorId = studentRecord?.supervisorId || ''
      }
      if (!targetSupervisorId) {
        // Fallback to first available supervisor or self
        const anySupervisor = await prisma.user.findFirst({
          where: { systemRole: 'SUPERVISOR' },
          select: { id: true },
        })
        targetSupervisorId = anySupervisor?.id || user.id
      }
    } else if (user.systemRole === 'SUPERVISOR') {
      targetSupervisorId = user.id
      if (!targetStudentId) {
        // Fallback to first supervised student or any student or self
        const firstStudent = await prisma.user.findFirst({
          where: {
            OR: [
              { supervisorId: user.id },
              { systemRole: 'STUDENT' },
            ],
          },
          select: { id: true },
        })
        targetStudentId = firstStudent?.id || user.id
      }
    } else {
      // ADMIN
      if (!targetStudentId) targetStudentId = user.id
      if (!targetSupervisorId) targetSupervisorId = user.id
    }

    // Verify foreign key users exist in DB before creating
    const [studentExists, supervisorExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetStudentId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: targetSupervisorId }, select: { id: true } }),
    ])

    if (!studentExists) targetStudentId = user.id
    if (!supervisorExists) targetSupervisorId = user.id

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

    // Notify other party safely
    const notifyTarget = user.id === targetStudentId ? targetSupervisorId : targetStudentId
    if (notifyTarget && notifyTarget !== user.id) {
      try {
        await createNotification({
          userId: notifyTarget,
          title: 'New Research Milestone Set',
          message: `${user.name} established milestone: "${milestone.title}"`,
          type: 'ASSIGNMENT',
          link: '/milestones',
        })
      } catch {
        // Notification is non-blocking
      }
    }

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}

function milestoneTitle(t: string) {
  return t.length > 40 ? `${t.substring(0, 40)}...` : t
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

    if (isStudent && status !== undefined && status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Students can only submit their own milestone deliverables' },
        { status: 403 }
      )
    }

    if (isStudent && feedback !== undefined) {
      return NextResponse.json(
        { error: 'Only supervisors can provide milestone feedback' },
        { status: 403 }
      )
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
