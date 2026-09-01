import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/paper-trackers/[id]/steps/reorder
// Allows supervisor or admin to swap or reorder steps
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: trackerId } = await params

    const tracker = await prisma.paperTracker.findUnique({
      where: { id: trackerId },
      include: {
        owner: { select: { id: true, supervisorId: true } },
        shares: true,
      },
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
    }

    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisorOfOwner = user.systemRole === 'SUPERVISOR' && tracker.owner?.supervisorId === user.id
    const isOwner = tracker.ownerId === user.id

    // Check if user has supervisor/lead role over the tracker
    if (!isAdmin && !isSupervisorOfOwner && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only the Supervisor, PI, or Owner can reorder research milestones' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { stepId, direction } = body as { stepId: string; direction: 'UP' | 'DOWN' }

    if (!stepId || (direction !== 'UP' && direction !== 'DOWN')) {
      return NextResponse.json({ error: 'Invalid stepId or direction (must be UP or DOWN)' }, { status: 400 })
    }

    const currentStep = await prisma.paperTrackerStep.findUnique({
      where: { id: stepId },
    })

    if (!currentStep || currentStep.trackerId !== trackerId) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    const targetStepIndex = direction === 'UP' ? currentStep.stepIndex - 1 : currentStep.stepIndex + 1

    if (targetStepIndex < 1) {
      return NextResponse.json({ error: 'Cannot move above the first milestone' }, { status: 400 })
    }

    const adjacentStep = await prisma.paperTrackerStep.findFirst({
      where: {
        trackerId,
        stepIndex: targetStepIndex,
      },
    })

    if (!adjacentStep) {
      return NextResponse.json({ error: 'No adjacent milestone to swap with' }, { status: 400 })
    }

    // Safely swap stepIndex within transaction using temporary index
    await prisma.$transaction([
      // 1. Move currentStep to temporary negative index
      prisma.paperTrackerStep.update({
        where: { id: currentStep.id },
        data: { stepIndex: -999 },
      }),
      // 2. Move adjacentStep to currentStep's stepIndex
      prisma.paperTrackerStep.update({
        where: { id: adjacentStep.id },
        data: { stepIndex: currentStep.stepIndex },
      }),
      // 3. Move currentStep to targetStepIndex
      prisma.paperTrackerStep.update({
        where: { id: currentStep.id },
        data: { stepIndex: targetStepIndex },
      }),
      // 4. Touch tracker
      prisma.paperTracker.update({
        where: { id: trackerId },
        data: { updatedAt: new Date() },
      }),
    ])

    // Return all updated steps in order
    const updatedSteps = await prisma.paperTrackerStep.findMany({
      where: { trackerId },
      orderBy: { stepIndex: 'asc' },
    })

    return NextResponse.json({ success: true, steps: updatedSteps })
  } catch (error: any) {
    console.error('Error reordering steps:', error)
    return NextResponse.json({ error: 'Failed to reorder steps' }, { status: 500 })
  }
}
