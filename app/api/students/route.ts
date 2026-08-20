import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/students — List supervised students with reading progress & lab tasks
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only Supervisors and Administrators can access student rosters' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') // 'supervised' | 'all' | 'discover'
    const search = searchParams.get('search')?.trim()

    const where: any = {
      systemRole: 'STUDENT',
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }

    // If supervisor and mode is not 'all' / 'discover', include all students in supervisor's supervision sphere
    if (user.systemRole === 'SUPERVISOR' && mode !== 'all' && mode !== 'discover') {
      const supervisorSphereConditions = [
        { supervisorId: user.id },
        { labMemberships: { some: { lab: { leadId: user.id } } } },
        { assignedPapers: { some: { assignedById: user.id } } },
        { assignedLabTasks: { some: { createdById: user.id } } },
        { milestonesAsStudent: { some: { supervisorId: user.id } } },
        { meetingsAsStudent: { some: { supervisorId: user.id } } },
      ]

      if (search) {
        where.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
            ],
          },
          {
            OR: supervisorSphereConditions,
          },
        ]
        delete where.OR
      } else {
        where.OR = supervisorSphereConditions
      }
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        institution: true,
        department: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        labMemberships: {
          select: {
            role: true,
            joinedAt: true,
            lab: {
              select: {
                id: true,
                name: true,
                slug: true,
                leadId: true,
              },
            },
          },
        },
        groupMemberships: {
          select: {
            role: true,
            group: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        papers: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            isFavorite: true,
            replicationStatus: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        assignedPapers: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            createdAt: true,
            assignedById: true,
            paper: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignedLabTasks: {
          select: {
            id: true,
            title: true,
            category: true,
            priority: true,
            status: true,
            dueDate: true,
            deliverableUrl: true,
            createdAt: true,
            labId: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        milestonesAsStudent: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: 'asc' },
        },
        meetingsAsStudent: {
          where: user.systemRole === 'SUPERVISOR' ? { supervisorId: user.id } : {},
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            status: true,
          },
          orderBy: { scheduledAt: 'desc' },
          take: 3,
        },
        _count: {
          select: {
            papers: true,
            notes: true,
            collections: true,
            tags: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Compute comprehensive student progress metrics & supervision health status
    const studentsWithMetrics = students.map((s) => {
      // Library Paper Reading Stats
      const totalLibrary = s.papers.length
      const completedLibrary = s.papers.filter((p) => p.status === 'COMPLETED').length
      const readingLibrary = s.papers.filter((p) => p.status === 'READING').length
      const toReadLibrary = s.papers.filter((p) => p.status === 'TO_READ').length
      const libraryCompletionRate = totalLibrary > 0 ? Math.round((completedLibrary / totalLibrary) * 100) : 0

      // Assigned Paper Reading Stats (from supervisor)
      const totalAssigned = s.assignedPapers.length
      const completedAssigned = s.assignedPapers.filter(
        (a) => a.status === 'COMPLETED' || a.paper?.status === 'COMPLETED'
      ).length
      const inProgressAssigned = s.assignedPapers.filter(
        (a) => a.status === 'IN_PROGRESS' || (a.status !== 'COMPLETED' && a.paper?.status === 'READING')
      ).length
      const pendingAssigned = s.assignedPapers.filter(
        (a) => a.status === 'PENDING' && a.paper?.status !== 'READING' && a.paper?.status !== 'COMPLETED'
      ).length
      const assignedCompletionRate = totalAssigned > 0 ? Math.round((completedAssigned / totalAssigned) * 100) : 0

      // Lab Research Tasks Stats
      const totalTasks = s.assignedLabTasks.length
      const activeTasks = s.assignedLabTasks.filter(
        (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
      ).length
      const completedTasks = s.assignedLabTasks.filter((t) => t.status === 'COMPLETED').length
      const inReviewTasks = s.assignedLabTasks.filter((t) => t.status === 'IN_REVIEW').length

      // Thesis Milestones Stats
      const totalMilestones = s.milestonesAsStudent.length
      const completedMilestones = s.milestonesAsStudent.filter((m) => m.status === 'APPROVED').length

      // Upcoming Meetings
      const upcomingMeetings = s.meetingsAsStudent.filter(
        (m) => new Date(m.scheduledAt).getTime() > Date.now() && m.status === 'SCHEDULED'
      )

      // Determine supervision health state
      let healthStatus: 'HIGH_VELOCITY' | 'ON_TRACK' | 'TASKS_DUE' | 'INACTIVE' = 'ON_TRACK'
      if (pendingAssigned > 0 || activeTasks > 2) {
        healthStatus = 'TASKS_DUE'
      } else if (completedAssigned >= 2 || completedLibrary >= 3 || (totalAssigned > 0 && assignedCompletionRate >= 60)) {
        healthStatus = 'HIGH_VELOCITY'
      } else if (totalLibrary === 0 && totalAssigned === 0 && totalTasks === 0) {
        healthStatus = 'INACTIVE'
      }

      const isDirectlySupervised = s.supervisorId === user.id

      return {
        ...s,
        isDirectlySupervised,
        metrics: {
          // Paper Reading (Assigned Papers)
          totalAssignedPapers: totalAssigned,
          completedAssignedPapers: completedAssigned,
          inProgressAssignedPapers: inProgressAssigned,
          pendingAssignedPapers: pendingAssigned,
          assignedCompletionRate,

          // Paper Reading (Total Library)
          totalPapers: totalLibrary,
          completedPapers: completedLibrary,
          readingPapers: readingLibrary,
          toReadPapers: toReadLibrary,
          completionRate: libraryCompletionRate,

          // Lab Tasks
          totalTasks,
          activeTasks,
          completedTasks,
          inReviewTasks,

          // Milestones & Notes
          totalMilestones,
          completedMilestones,
          totalNotes: s._count.notes,
          upcomingMeetingsCount: upcomingMeetings.length,
          healthStatus,
        },
      }
    })

    return NextResponse.json(studentsWithMetrics)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

// POST /api/students — Link / Assign student to supervisor
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { studentId } = body

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { supervisorId: user.id },
    })

    await createNotification({
      userId: studentId,
      title: 'Advisor Supervision Connected 🎓',
      message: `${user.name} added you to their active research supervision roster.`,
      type: 'SYSTEM',
      link: '/',
    })

    return NextResponse.json({ success: true, student: updated })
  } catch (error: any) {
    console.error('Error linking student:', error)
    return NextResponse.json({ error: error.message || 'Failed to link student' }, { status: 500 })
  }
}

// DELETE /api/students — Unlink student from supervisor
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { supervisorId: null },
    })

    return NextResponse.json({ success: true, message: 'Student unlinked', student: updated })
  } catch (error: any) {
    console.error('Error unlinking student:', error)
    return NextResponse.json({ error: error.message || 'Failed to unlink student' }, { status: 500 })
  }
}
