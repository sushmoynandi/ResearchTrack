import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// POST /api/labs/join — Join a lab using a join code or submit membership application
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { joinCode, labId, message } = body

    let targetLab

    if (joinCode) {
      targetLab = await prisma.lab.findUnique({
        where: { joinCode: joinCode.trim().toUpperCase() },
        include: { lead: true },
      })
    } else if (labId) {
      targetLab = await prisma.lab.findUnique({
        where: { id: labId },
        include: { lead: true },
      })
    }

    if (!targetLab) {
      return NextResponse.json({ error: 'Invalid Lab Join Code or Lab not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.labMember.findUnique({
      where: {
        labId_userId: {
          labId: targetLab.id,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'You are already an enrolled member of this lab' }, { status: 400 })
    }

    // Direct Join with Join Code
    if (joinCode) {
      const assignedRole = user.systemRole === 'SUPERVISOR' ? 'CO_LEAD' : 'RESEARCHER'
      const membership = await prisma.labMember.create({
        data: {
          labId: targetLab.id,
          userId: user.id,
          role: assignedRole,
        },
      })

      // Notify lab lead
      await createNotification({
        userId: targetLab.leadId,
        title: user.systemRole === 'SUPERVISOR' ? 'New Co-Supervisor Joined Lab! 👥' : 'New Lab Member Joined! 👥',
        message: `${user.name} joined ${targetLab.name} as ${user.systemRole === 'SUPERVISOR' ? 'Co-Supervisor' : 'Researcher'} using the lab invite code.`,
        type: 'SYSTEM',
        link: `/labs/${targetLab.slug}`,
      })

      return NextResponse.json({
        success: true,
        joined: true,
        lab: targetLab,
        membership,
      })
    }

    // Otherwise, create or update a LabJoinRequest
    const joinReq = await prisma.labJoinRequest.upsert({
      where: {
        labId_userId: {
          labId: targetLab.id,
          userId: user.id,
        },
      },
      update: {
        status: 'PENDING',
        message: message?.trim() || null,
      },
      create: {
        labId: targetLab.id,
        userId: user.id,
        message: message?.trim() || null,
        status: 'PENDING',
      },
    })

    // Notify lab lead of join request
    await createNotification({
      userId: targetLab.leadId,
      title: 'Lab Join Request Received 📬',
      message: `${user.name} requested to join ${targetLab.name}. Review application in Lab Center.`,
      type: 'SYSTEM',
      link: `/labs/${targetLab.slug}`,
    })

    return NextResponse.json({
      success: true,
      pending: true,
      request: joinReq,
      lab: targetLab,
    })
  } catch (error) {
    console.error('Error joining lab:', error)
    return NextResponse.json({ error: 'Failed to process lab join request' }, { status: 500 })
  }
}
