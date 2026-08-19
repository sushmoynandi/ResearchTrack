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
      supervisedStudents,
      issuedAssignments,
      supervisorRecord,
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
          paper: { select: { id: true, title: true, authors: true, status: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
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
    ])

    const stats = {
      systemRole: user.systemRole,
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
      completionRate: totalPapers > 0 ? Math.round((completed / totalPapers) * 100) : 0,
      myAssignments,
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
