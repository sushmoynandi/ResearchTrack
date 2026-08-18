import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

// GET /api/students — List supervised students with reading progress
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only Supervisors and Administrators can access student rosters' },
        { status: 403 }
      )
    }

    const where: Record<string, unknown> = {
      systemRole: 'STUDENT',
    }

    if (user.systemRole === 'SUPERVISOR') {
      where.OR = [
        { supervisorId: user.id },
        { supervisorId: null },
        ...(user.department ? [{ department: user.department }] : []),
      ]
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
        supervisor: {
          select: {
            id: true,
            name: true,
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
        },
        assignedPapers: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            createdAt: true,
            paper: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
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

    // Compute student progress statistics
    const studentsWithMetrics = students.map((s) => {
      const total = s.papers.length
      const completed = s.papers.filter((p) => p.status === 'COMPLETED').length
      const reading = s.papers.filter((p) => p.status === 'READING').length
      const toRead = s.papers.filter((p) => p.status === 'TO_READ').length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

      const pendingAssignments = s.assignedPapers.filter(
        (a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS'
      ).length

      return {
        ...s,
        metrics: {
          totalPapers: total,
          completedPapers: completed,
          readingPapers: reading,
          toReadPapers: toRead,
          completionRate,
          pendingAssignments,
          totalNotes: s._count.notes,
        },
      }
    })

    return NextResponse.json(studentsWithMetrics)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
