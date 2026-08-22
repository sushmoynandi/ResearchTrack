import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// GET /api/students/requests — Fetch pending supervision invitations (for student or supervisor)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole === 'STUDENT') {
      // Students see their pending incoming invitations
      const requests = await prisma.supervisionRequest.findMany({
        where: {
          studentId: user.id,
          status: 'PENDING',
        },
        include: {
          supervisor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              department: true,
              institution: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(requests)
    }

    if (user.systemRole === 'SUPERVISOR' || user.systemRole === 'ADMIN') {
      // Supervisors see their outgoing requests (pending, approved, rejected)
      const requests = await prisma.supervisionRequest.findMany({
        where: {
          supervisorId: user.id,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              department: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(requests)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('Error fetching supervision requests:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch supervision requests' },
      { status: 500 }
    )
  }
}

// POST /api/students/requests — Supervisor claims/invites a student to their roster
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only supervisors can claim students' }, { status: 403 })
    }

    const body = await request.json()
    const { studentId, message } = body

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student || student.systemRole !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if already supervised by this supervisor
    if (student.supervisorId === user.id) {
      return NextResponse.json(
        { error: 'Student is already on your supervision roster' },
        { status: 400 }
      )
    }

    // Create or re-open supervision request
    const supervisionRequest = await prisma.supervisionRequest.upsert({
      where: {
        supervisorId_studentId: {
          supervisorId: user.id,
          studentId: studentId,
        },
      },
      update: {
        status: 'PENDING',
        message: message || null,
        updatedAt: new Date(),
      },
      create: {
        supervisorId: user.id,
        studentId: studentId,
        status: 'PENDING',
        message: message || null,
      },
    })

    // Send high-priority in-app notification to the student
    await createNotification({
      userId: studentId,
      title: 'Advisor Supervision Invitation 🎓',
      message: `${user.name} (${user.department || user.institution || 'Faculty Advisor'}) has invited you to join their direct research supervision roster.`,
      type: 'SYSTEM',
      link: '/',
    })

    return NextResponse.json({
      success: true,
      message: `Supervision invitation sent to ${student.name}`,
      request: supervisionRequest,
    })
  } catch (error: any) {
    console.error('Error creating supervision request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send supervision invitation' },
      { status: 500 }
    )
  }
}
