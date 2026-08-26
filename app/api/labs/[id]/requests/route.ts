import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id]/requests — Fetch pending join requests (Supervisor / Admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    if (lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requests = await prisma.labJoinRequest.findMany({
      where: {
        labId: lab.id,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Failed to fetch join requests' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/requests — Approve or Reject a join request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { requestId, status, role = 'RESEARCHER' } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and decision status are required' }, { status: 400 })
    }

    const joinReq = await prisma.labJoinRequest.findUnique({
      where: { id: requestId },
      include: { lab: true, user: true },
    })

    if (!joinReq) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    // Permission check: Must be lab lead or admin
    if (joinReq.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead can approve membership requests' }, { status: 403 })
    }

    // Update request status
    await prisma.labJoinRequest.update({
      where: { id: requestId },
      data: { status },
    })

    if (status === 'APPROVED') {
      const applicant = await prisma.user.findUnique({
        where: { id: joinReq.userId },
        select: { systemRole: true, name: true },
      })
      const effectiveRole = applicant?.systemRole === 'SUPERVISOR' ? 'CO_LEAD' : (role || 'RESEARCHER')

      // Add as LabMember
      await prisma.labMember.upsert({
        where: {
          labId_userId: {
            labId: joinReq.labId,
            userId: joinReq.userId,
          },
        },
        update: { role: effectiveRole },
        create: {
          labId: joinReq.labId,
          userId: joinReq.userId,
          role: effectiveRole,
        },
      })

      // Notify accepted member
      await createNotification({
        userId: joinReq.userId,
        title: applicant?.systemRole === 'SUPERVISOR' ? 'Lab Application Approved as Co-Supervisor! 🏛️' : 'Lab Application Approved! 🎓',
        message: `Your membership request to join "${joinReq.lab.name}" as ${applicant?.systemRole === 'SUPERVISOR' ? 'Co-Supervisor' : 'Researcher'} was approved by ${user.name}!`,
        type: 'SYSTEM',
        link: `/labs/${joinReq.lab.slug}`,
      })
    } else {
      // Notify rejected applicant
      await createNotification({
        userId: joinReq.userId,
        title: 'Lab Application Update',
        message: `Your application to join "${joinReq.lab.name}" could not be accommodated at this time.`,
        type: 'SYSTEM',
        link: '/labs',
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Error updating join request:', error)
    return NextResponse.json({ error: 'Failed to update join request' }, { status: 500 })
  }
}
