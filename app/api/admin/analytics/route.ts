import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

// GET /api/admin/analytics — System-wide metrics for Administrators
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
    }

    const [
      totalUsers,
      studentCount,
      supervisorCount,
      adminCount,
      totalPapers,
      totalNotes,
      totalCollections,
      totalAssignments,
      completedAssignments,
      completedPapers,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { systemRole: 'STUDENT' } }),
      prisma.user.count({ where: { systemRole: 'SUPERVISOR' } }),
      prisma.user.count({ where: { systemRole: 'ADMIN' } }),
      prisma.paper.count(),
      prisma.note.count(),
      prisma.collection.count(),
      prisma.assignment.count(),
      prisma.assignment.count({ where: { status: 'COMPLETED' } }),
      prisma.paper.count({ where: { status: 'COMPLETED' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          systemRole: true,
          institution: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      totalUsers,
      studentCount,
      supervisorCount,
      adminCount,
      totalPapers,
      totalNotes,
      totalCollections,
      totalAssignments,
      completedAssignments,
      paperCompletionRate: totalPapers > 0 ? Math.round((completedPapers / totalPapers) * 100) : 0,
      assignmentCompletionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      recentUsers,
    })
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
