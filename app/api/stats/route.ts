import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        totalPapers: 0,
        toRead: 0,
        reading: 0,
        completed: 0,
        archived: 0,
        favorites: 0,
        totalNotes: 0,
        totalCollections: 0,
        totalTags: 0,
        recentPapers: [],
        tagDistribution: [],
        topCollections: [],
        completionRate: 0,
      })
    }

    const paperWhere =
      user.systemRole === 'STUDENT'
        ? {
            OR: [
              { userId: user.id },
              { assignments: { some: { studentId: user.id } } },
            ],
          }
        : { userId: user.id }

    // Role-tailored stats gathering
    const [
      totalPapers,
      toRead,
      reading,
      completed,
      archived,
      favorites,
      totalNotes,
      totalCollections,
      totalTags,
      recentPapers,
      tagsWithCount,
      collectionsWithCount,
      myAssignments,
      recentNotifications,
      supervisedStudents,
      issuedAssignments,
      supervisorRecord,
      studentLabTasks,
      upcomingMeeting,
      studentMilestones,
    ] = await Promise.all([
      prisma.paper.count({ where: paperWhere }),
      prisma.paper.count({ where: { ...paperWhere, status: 'TO_READ' } }),
      prisma.paper.count({ where: { ...paperWhere, status: 'READING' } }),
      prisma.paper.count({ where: { ...paperWhere, status: 'COMPLETED' } }),
      prisma.paper.count({ where: { ...paperWhere, status: 'ARCHIVED' } }),
      prisma.paper.count({ where: { ...paperWhere, isFavorite: true } }),
      prisma.note.count({ where: { userId: user.id } }),
      prisma.collection.count({ where: { userId: user.id } }),
      prisma.tag.count({ where: { userId: user.id } }),
      prisma.paper.findMany({
        where: paperWhere,
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          tags: true,
          _count: { select: { notes: true } },
        },
      }),
      prisma.tag.findMany({
        where: { userId: user.id },
        take: 10,
        include: {
          _count: { select: { papers: true } },
        },
        orderBy: {
          papers: { _count: 'desc' },
        },
      }),
      prisma.collection.findMany({
        where: { userId: user.id },
        take: 5,
        include: {
          _count: { select: { papers: true } },
        },
        orderBy: {
          papers: { _count: 'desc' },
        },
      }),
      // Assignments assigned TO this user (Student)
      prisma.assignment.findMany({
        where: { studentId: user.id },
        include: {
          paper: { select: { id: true, title: true, authors: true, status: true, publicationYear: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Recent notifications for the student / user
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      // Supervised students (for Supervisor / Admin)
      user.systemRole === 'SUPERVISOR' || user.systemRole === 'ADMIN'
        ? prisma.user.findMany({
            where: user.systemRole === 'SUPERVISOR' ? { supervisorId: user.id } : { systemRole: 'STUDENT' },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              department: true,
              _count: {
                select: {
                  papers: true,
                  notes: true,
                  assignedPapers: true,
                },
              },
            },
            take: 8,
          })
        : [],
      // Assignments issued BY this user (Supervisor / Admin)
      user.systemRole === 'SUPERVISOR' || user.systemRole === 'ADMIN'
        ? prisma.assignment.findMany({
            where: user.systemRole === 'SUPERVISOR' ? { assignedById: user.id } : {},
            include: {
              paper: { select: { id: true, title: true } },
              student: { select: { id: true, name: true } },
            },
            take: 6,
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Advisor contact context for the student dashboard
      user.systemRole === 'STUDENT'
        ? prisma.user.findUnique({
            where: { id: user.id },
            select: {
              supervisor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  institution: true,
                  department: true,
                },
              },
            },
          })
        : null,
      // Lab tasks assigned to student
      user.systemRole === 'STUDENT'
        ? prisma.labTask.findMany({
            where: { assigneeId: user.id },
            select: { id: true, title: true, status: true, priority: true, dueDate: true, category: true, deliverableUrl: true },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Upcoming 1-on-1 meeting for student
      user.systemRole === 'STUDENT'
        ? prisma.meeting.findFirst({
            where: {
              studentId: user.id,
              scheduledAt: { gte: new Date() },
              status: 'SCHEDULED',
            },
            include: {
              supervisor: { select: { id: true, name: true, email: true } },
            },
            orderBy: { scheduledAt: 'asc' },
          })
        : null,
      // Milestones for student
      user.systemRole === 'STUDENT'
        ? prisma.thesisMilestone.findMany({
            where: { studentId: user.id },
            select: { id: true, status: true },
          })
        : [],
    ])

    // Student performance metrics calculation
    const totalAssignedPapers = myAssignments.length
    const completedAssignedPapers = myAssignments.filter(
      (a) => a.status === 'COMPLETED'
    ).length
    const readingAssignedPapers = myAssignments.filter(
      (a) => a.status === 'IN_PROGRESS'
    ).length
    const pendingAssignedPapers = myAssignments.filter(
      (a) => a.status === 'PENDING'
    ).length
    const assignedCompletionRate =
      totalAssignedPapers > 0 ? Math.round((completedAssignedPapers / totalAssignedPapers) * 100) : 0

    let finalTotalPapers = totalPapers
    let finalToRead = toRead
    let finalReading = reading
    let finalCompleted = completed

    if (user.systemRole === 'STUDENT') {
      const allStudentPapers = await prisma.paper.findMany({
        where: paperWhere,
        select: {
          id: true,
          status: true,
          userId: true,
          assignments: {
            where: { studentId: user.id },
            select: { status: true },
          },
        },
      })

      finalTotalPapers = allStudentPapers.length
      finalToRead = 0
      finalReading = 0
      finalCompleted = 0

      for (const p of allStudentPapers) {
        const a = p.assignments[0]
        let effStatus = p.status
        if (a) {
          if (a.status === 'COMPLETED') effStatus = 'COMPLETED'
          else if (a.status === 'IN_PROGRESS') effStatus = 'READING'
          else if (a.status === 'PENDING') effStatus = 'TO_READ'
        }

        if (effStatus === 'COMPLETED') finalCompleted++
        else if (effStatus === 'READING') finalReading++
        else if (effStatus === 'TO_READ') finalToRead++
      }
    }

    const tasksList = (studentLabTasks || []) as any[]
    const activeLabTasks = tasksList.filter(
      (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
    ).length
    const completedLabTasks = tasksList.filter((t) => t.status === 'COMPLETED').length

    const milestonesList = (studentMilestones || []) as any[]
    const totalMilestones = milestonesList.length
    const completedMilestones = milestonesList.filter((m) => m.status === 'APPROVED').length

    const stats = {
      systemRole: user.systemRole,
      totalPapers: finalTotalPapers,
      toRead: finalToRead,
      reading: finalReading,
      completed: finalCompleted,
      archived,
      favorites,
      totalNotes,
      totalCollections,
      totalTags,
      recentPapers,
      tagDistribution: tagsWithCount.map((t) => ({
        id: t.id,
        name: t.name,
        count: t._count.papers,
      })),
      topCollections: collectionsWithCount.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        count: c._count.papers,
      })),
      completionRate: finalTotalPapers > 0 ? Math.round((finalCompleted / finalTotalPapers) * 100) : 0,

      // Synced Assigned Paper Reading Stats
      totalAssignedPapers,
      completedAssignedPapers,
      readingAssignedPapers,
      pendingAssignedPapers,
      assignedCompletionRate,

      // Synced Lab Tasks & Meetings
      labTasks: tasksList.slice(0, 4),
      activeLabTasks,
      completedLabTasks,
      upcomingMeeting: upcomingMeeting || null,
      totalMilestones,
      completedMilestones,

      myAssignments: myAssignments.slice(0, 5),
      pendingAssignments: myAssignments.filter((a) => a.status !== 'COMPLETED'),
      recentNotifications,
      supervisedStudents,
      issuedAssignments,
      supervisor: supervisorRecord?.supervisor || null,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error)
    return NextResponse.json({
      totalPapers: 0,
      toRead: 0,
      reading: 0,
      completed: 0,
      archived: 0,
      favorites: 0,
      totalNotes: 0,
      totalCollections: 0,
      totalTags: 0,
      recentPapers: [],
      tagDistribution: [],
      topCollections: [],
      completionRate: 0,
      myAssignments: [],
      supervisedStudents: [],
      issuedAssignments: [],
      supervisor: null,
    })
  }
}
