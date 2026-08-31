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
    const isCollaborator = tracker.shares.some(
      (s) => s.userId === user.id && s.permission === 'COLLABORATE'
    )

    // Check lab/group share
    let isLabCollaborator = false
    if (tracker.shares.some((s) => s.labId || s.groupId)) {
      const [userLabs, userGroups, ledLabs] = await Promise.all([
        prisma.labMember.findMany({ where: { userId: user.id }, select: { labId: true } }),
        prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } }),
        prisma.lab.findMany({ where: { leadId: user.id }, select: { id: true } }),
      ])
      const userLabIds = [...userLabs.map((l) => l.labId), ...ledLabs.map((l) => l.id)]
      const userGroupIds = userGroups.map((g) => g.groupId)

      isLabCollaborator = tracker.shares.some(
        (s) =>
          s.permission === 'COLLABORATE' &&
          ((s.labId && userLabIds.includes(s.labId)) || (s.groupId && userGroupIds.includes(s.groupId)))
      )
    }

    if (!isOwner && !isAdmin && !isCollaborator && !isLabCollaborator) {
      return NextResponse.json({ error: 'Forbidden: You do not have edit permission for this step' }, { status: 403 })
    }

    const body = await request.json()
    const {
      status,
      reviewAction, // 'ACCEPT' | 'REJECT'
      dueDate,
      deliverableUrl,
      deliverableNotes,
      studentNotes,
      supervisorFeedback,
    } = body

    const isSupervisorRole = user.systemRole === 'SUPERVISOR' || isAdmin
    const updateData: any = {}

    // Review Action Logic (Strictly SUPERVISOR or ADMIN only)
    if (reviewAction === 'ACCEPT' || reviewAction === 'REJECT') {
      if (!isSupervisorRole) {
        return NextResponse.json(
          { error: 'Forbidden: Only Supervisors or Administrators can Accept or Reject research stages' },
          { status: 403 }
        )
      }
    }

    if (reviewAction === 'ACCEPT') {
      updateData.status = 'COMPLETED'
      updateData.completedAt = new Date()
      if (supervisorFeedback) updateData.supervisorFeedback = supervisorFeedback

      // Automatically advance: Set the subsequent step (stepIndex + 1) to IN_PROGRESS if it's currently PENDING
      const nextStep = await prisma.paperTrackerStep.findFirst({
        where: {
          trackerId,
          stepIndex: step.stepIndex + 1,
        },
      })
      if (nextStep && (nextStep.status === 'PENDING' || nextStep.status === 'BLOCKED')) {
        await prisma.paperTrackerStep.update({
          where: { id: nextStep.id },
          data: { status: 'IN_PROGRESS' },
        })
      }

      // Notify the student / tracker owner
      if (user.id !== tracker.ownerId) {
        await createNotification({
          userId: tracker.ownerId,
          title: `✅ Stage ${step.stepIndex} Approved: ${step.title}`,
          message: `${user.name} approved stage ${step.stepIndex}. You may now proceed to ${nextStep ? `Stage ${nextStep.stepIndex}: ${nextStep.title}` : 'final submission'}!`,
          type: 'FEEDBACK',
          link: `/paper-tracker/${trackerId}`,
        }).catch(() => {})
      }
    } else if (reviewAction === 'REJECT') {
      // If rejected, keep on the same step with REJECTED or IN_PROGRESS status
      updateData.status = 'REJECTED'
      updateData.completedAt = null
      if (supervisorFeedback) updateData.supervisorFeedback = supervisorFeedback

      // Keep next steps PENDING (do not allow advancement)
      await prisma.paperTrackerStep.updateMany({
        where: {
          trackerId,
          stepIndex: { gt: step.stepIndex },
          status: 'IN_PROGRESS',
        },
        data: { status: 'PENDING' },
      })

      // Notify the student / tracker owner
      if (user.id !== tracker.ownerId) {
        await createNotification({
          userId: tracker.ownerId,
          title: `⚠️ Revision Requested on Stage ${step.stepIndex}: ${step.title}`,
          message: `${user.name} requested changes on stage ${step.stepIndex}. Please review the remarks and update deliverables.`,
          type: 'FEEDBACK',
          link: `/paper-tracker/${trackerId}`,
        }).catch(() => {})
      }
    } else if (typeof status === 'string') {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (status === 'PENDING' || status === 'IN_PROGRESS' || status === 'SUBMITTED' || status === 'REJECTED') {
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
      // Review feedback can be provided by owners, collaborators, or admins
      if (isAdmin || isOwner || isCollaborator || isLabCollaborator) {
        updateData.supervisorFeedback = supervisorFeedback
      }
    }

    const updatedStep = await prisma.paperTrackerStep.update({
      where: { id: stepId },
      data: updateData,
    })

    // ─── NOTIFICATION DISPATCH TO RELEVANT PARTIES (STUDENT & SUPERVISORS) ───
    // 1. When a student submits a stage for review or updates deliverable
    if (status === 'SUBMITTED' || (!reviewAction && (deliverableUrl || deliverableNotes) && user.id === tracker.ownerId)) {
      // Find supervisor and shared collaborators to notify
      const targetUserIds = new Set<string>()
      if (tracker.owner?.supervisorId && tracker.owner.supervisorId !== user.id) {
        targetUserIds.add(tracker.owner.supervisorId)
      }
      for (const share of tracker.shares) {
        if (share.userId && share.userId !== user.id) {
          targetUserIds.add(share.userId)
        }
        if (share.labId) {
          const lab = await prisma.lab.findUnique({ where: { id: share.labId }, select: { leadId: true } })
          if (lab?.leadId && lab.leadId !== user.id) {
            targetUserIds.add(lab.leadId)
          }
        }
      }

      for (const recipientId of targetUserIds) {
        await createNotification({
          userId: recipientId,
          title: status === 'SUBMITTED' ? `📥 Stage ${step.stepIndex} Submitted for Review` : `📦 Deliverable Updated on Stage ${step.stepIndex}`,
          message: `${user.name} submitted deliverables on Stage ${step.stepIndex}: "${step.title}" (${tracker.title}). Review decision needed.`,
          type: 'FEEDBACK',
          link: `/paper-tracker/${trackerId}`,
        }).catch(() => {})
      }
    }

    // 2. If general feedback without explicit accept/reject reviewAction (notify student/owner)
    if (!reviewAction && supervisorFeedback && user.id !== tracker.ownerId) {
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
