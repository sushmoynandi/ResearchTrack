import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/replication — Fetch replication details & linked artifacts
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId } = await params

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id: paperId }, { slug: paperId }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        userId: true,
        replicationStatus: true,
        codeUrl: true,
        modelUrl: true,
        datasetUrl: true,
        weightsUrl: true,
        studentRepoUrl: true,
        notebookUrl: true,
        hardwareSpecs: true,
        replicationNotes: true,
        replicationChecklist: true,
        parameters: true,
        contextWindow: true,
        architecture: true,
        computeBudget: true,
        user: { select: { id: true, name: true, supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
        shares: { select: { sharedWithId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Access authorization check
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this paper workspace' },
        { status: 403 }
      )
    }

    let parsedChecklist = {}
    if (paper.replicationChecklist) {
      try {
        parsedChecklist = JSON.parse(paper.replicationChecklist)
      } catch {
        parsedChecklist = {}
      }
    }

    return NextResponse.json({
      replicationStatus: paper.replicationStatus,
      codeUrl: paper.codeUrl,
      modelUrl: paper.modelUrl,
      datasetUrl: paper.datasetUrl,
      weightsUrl: paper.weightsUrl,
      studentRepoUrl: paper.studentRepoUrl,
      notebookUrl: paper.notebookUrl,
      hardwareSpecs: paper.hardwareSpecs,
      replicationNotes: paper.replicationNotes,
      replicationChecklist: parsedChecklist,
      parameters: paper.parameters,
      contextWindow: paper.contextWindow,
      architecture: paper.architecture,
      computeBudget: paper.computeBudget,
    })
  } catch (error: any) {
    console.error('Error fetching replication details:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch replication details' },
      { status: 500 }
    )
  }
}

// PUT /api/papers/[id]/replication — Update replication status, checklist, and artifact links
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId } = await params
    const body = await request.json()
    const {
      replicationStatus,
      codeUrl,
      modelUrl,
      datasetUrl,
      weightsUrl,
      studentRepoUrl,
      notebookUrl,
      hardwareSpecs,
      replicationNotes,
      replicationChecklist,
      parameters,
      contextWindow,
      architecture,
      computeBudget,
    } = body

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id: paperId }, { slug: paperId }],
      },
      include: {
        user: { select: { id: true, name: true, supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
        shares: { select: { sharedWithId: true, permission: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Access authorization check
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update reproduction logs' },
        { status: 403 }
      )
    }

    const updateData: Record<string, any> = {}
    if (replicationStatus !== undefined) updateData.replicationStatus = replicationStatus
    if (codeUrl !== undefined) updateData.codeUrl = codeUrl?.trim() || null
    if (modelUrl !== undefined) updateData.modelUrl = modelUrl?.trim() || null
    if (datasetUrl !== undefined) updateData.datasetUrl = datasetUrl?.trim() || null
    if (weightsUrl !== undefined) updateData.weightsUrl = weightsUrl?.trim() || null
    if (studentRepoUrl !== undefined) updateData.studentRepoUrl = studentRepoUrl?.trim() || null
    if (notebookUrl !== undefined) updateData.notebookUrl = notebookUrl?.trim() || null
    if (hardwareSpecs !== undefined) updateData.hardwareSpecs = hardwareSpecs?.trim() || null
    if (replicationNotes !== undefined) updateData.replicationNotes = replicationNotes?.trim() || null
    if (parameters !== undefined) updateData.parameters = parameters?.trim() || null
    if (contextWindow !== undefined) updateData.contextWindow = contextWindow?.trim() || null
    if (architecture !== undefined) updateData.architecture = architecture?.trim() || null
    if (computeBudget !== undefined) updateData.computeBudget = computeBudget?.trim() || null

    if (replicationChecklist !== undefined) {
      updateData.replicationChecklist =
        typeof replicationChecklist === 'string'
          ? replicationChecklist
          : JSON.stringify(replicationChecklist)
    }

    const updated = await prisma.paper.update({
      where: { id: paper.id },
      data: updateData,
    })

    // Send notifications when reproduction status changes to a notable state
    if (replicationStatus && replicationStatus !== paper.replicationStatus) {
      if (user.systemRole === 'STUDENT' && paper.user?.supervisorId) {
        await createNotification({
          userId: paper.user.supervisorId,
          title: 'Reproduction Status Update 🛠️',
          message: `${user.name} marked "${paper.title.slice(0, 35)}..." as ${replicationStatus}`,
          type: 'STATUS_UPDATE',
          link: `/papers/${paper.slug || paper.id}`,
        }).catch(() => {})
      } else if (user.systemRole === 'SUPERVISOR' && paper.userId !== user.id) {
        await createNotification({
          userId: paper.userId,
          title: 'Advisor Updated Reproduction Status 🛠️',
          message: `${user.name} updated reproduction status on "${paper.title.slice(0, 35)}..."`,
          type: 'STATUS_UPDATE',
          link: `/papers/${paper.slug || paper.id}`,
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      paper: updated,
    })
  } catch (error: any) {
    console.error('Error updating replication details:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update replication details' },
      { status: 500 }
    )
  }
}
