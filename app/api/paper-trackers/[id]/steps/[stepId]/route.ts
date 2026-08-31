import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>
}

// PATCH /api/paper-trackers/[id]/steps/[stepId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: trackerId, stepId } = await params

    const step = await prisma.paperTrackerStep.findUnique({
      where: { id: stepId },
      include: {
        tracker: {
          include: {
            owner: { select: { id: true, name: true, supervisorId: true } },
            shares: true,
          },
        },
      },
    })

    if (!step || step.trackerId !== trackerId) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    const tracker = step.tracker
    const isOwner = tracker.ownerId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor = user.systemRole === 'SUPERVISOR'
    const isCollaborator = tracker.shares.some(
      (s) => s.userId === user.id && s.permission === 'COLLABORATE'
    )

    // Check lab/group share
    let isLabCollaborator = false
    if (tracker.shares.some((s) => s.labId || s.groupId)) {
      const [userLabs, userGroups] = await Promise.all([
        prisma.labMember.findMany({ where: { userId: user.id }, select: { labId: true } }),
        prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } }),
      ])
      const userLabIds = userLabs.map((l) => l.labId)
      const userGroupIds = userGroups.map((g) => g.groupId)

      isLabCollaborator = tracker.shares.some(
        (s) => (s.labId && userLabIds.includes(s.labId)) || (s.groupId && userGroupIds.includes(s.groupId))
      )
    }

    if (!isOwner && !isAdmin && !isSupervisor && !isCollaborator && !isLabCollaborator) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify this step' }, { status: 403 })
    }

    const body = await request.json()
    const {
      status,
      dueDate,
      deliverableUrl,
      deliverableNotes,
      studentNotes,
      supervisorFeedback,
    } = body

    const updateData: any = {}

    if (typeof status === 'string') {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (status === 'PENDING' || status === 'IN_PROGRESS') {
        updateData.completedAt = null
      }
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    if (typeof deliverableUrl === 'string' || deliverableUrl === null) {
      updateData.deliverableUrl = deliverableUrl?.trim() || null
    }

    if (typeof deliverableNotes === 'string' || deliverableNotes === null) {
      updateData.deliverableNotes = deliverableNotes
    }

    if (typeof studentNotes === 'string' || studentNotes === null) {
      updateData.studentNotes = studentNotes
    }

    if (typeof supervisorFeedback === 'string' || supervisorFeedback === null) {
      // Supervisor feedback / Review feedback can be provided by supervisors, owners, or collaborators
      if (isSupervisor || isAdmin || isOwner || isCollaborator || isLabCollaborator) {
        updateData.supervisorFeedback = supervisorFeedback
      }
    }

    const updatedStep = await prisma.paperTrackerStep.update({
      where: { id: stepId },
      data: updateData,
    })

    // If a collaborator or supervisor leaves feedback, notify the owner
    if (supervisorFeedback && user.id !== tracker.ownerId) {
      await createNotification({
        userId: tracker.ownerId,
        title: `💬 Feedback on Stage ${step.stepIndex}: ${step.title}`,
        message: `${user.name} left a review note on "${tracker.title}".`,
        type: 'FEEDBACK',
        link: `/paper-tracker/${trackerId}`,
      }).catch(() => {})
    }

    // Touch tracker updatedAt
    await prisma.paperTracker.update({
      where: { id: trackerId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(updatedStep)
  } catch (error: any) {
    console.error('Error updating tracker step:', error)
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 })
  }
}
