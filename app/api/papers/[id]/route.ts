import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id] — Get single paper with role-based access
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check paper exists
    const paper = await prisma.paper.findUnique({
      where: { id },
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, name: true, email: true, systemRole: true, institution: true, supervisorId: true } },
        notes: {
          include: {
            user: { select: { id: true, name: true, systemRole: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            assignedBy: { select: { id: true, name: true } },
            student: { select: { id: true, name: true } },
          },
        },
        feedback: {
          include: {
            author: { select: { id: true, name: true, image: true, systemRole: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Access check: Owner, Admin, Supervisor, or Assigned Student
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (paper.userId === user.id || paper.user.supervisorId === user.id)
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(paper)
  } catch (error) {
    console.error('Error fetching paper:', error)
    return NextResponse.json({ error: 'Failed to fetch paper' }, { status: 500 })
  }
}

// PUT /api/papers/[id] — Update paper
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.paper.findUnique({
      where: { id },
      include: {
        user: true,
        assignments: true,
        tags: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = existing.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (existing.userId === user.id || existing.user.supervisorId === user.id)
    const isAssigned = existing.assignments?.some((a) => a.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      authors,
      abstract,
      doi,
      url,
      journal,
      publicationYear,
      status,
      priority,
      isFavorite,
      pdfPath,
      arxivId,
      citationCount,
      codeUrl,
      modelUrl,
      datasetUrl,
      replicationStatus,
      parameters,
      contextWindow,
      architecture,
      computeBudget,
      benchmarks,
      problemSolved,
      keyContribution,
      limitations,
      literatureReview,
      tags,
      collections,
    } = body

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title.trim()
    if (authors !== undefined) updateData.authors = authors.trim()
    if (abstract !== undefined) updateData.abstract = abstract?.trim() || null
    if (doi !== undefined) updateData.doi = doi?.trim() || null
    if (url !== undefined) updateData.url = url?.trim() || null
    if (journal !== undefined) updateData.journal = journal?.trim() || null
    if (publicationYear !== undefined) updateData.publicationYear = publicationYear ? parseInt(publicationYear) : null
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (isFavorite !== undefined) updateData.isFavorite = Boolean(isFavorite)
    if (pdfPath !== undefined) updateData.pdfPath = pdfPath || null
    if (arxivId !== undefined) updateData.arxivId = arxivId?.trim() || null
    if (citationCount !== undefined) updateData.citationCount = citationCount ? parseInt(citationCount) : 0
    if (codeUrl !== undefined) updateData.codeUrl = codeUrl?.trim() || null
    if (modelUrl !== undefined) updateData.modelUrl = modelUrl?.trim() || null
    if (datasetUrl !== undefined) updateData.datasetUrl = datasetUrl?.trim() || null
    if (replicationStatus !== undefined) updateData.replicationStatus = replicationStatus
    if (parameters !== undefined) updateData.parameters = parameters?.trim() || null
    if (contextWindow !== undefined) updateData.contextWindow = contextWindow?.trim() || null
    if (architecture !== undefined) updateData.architecture = architecture?.trim() || null
    if (computeBudget !== undefined) updateData.computeBudget = computeBudget?.trim() || null
    if (benchmarks !== undefined) updateData.benchmarks = benchmarks ? (typeof benchmarks === 'string' ? benchmarks : JSON.stringify(benchmarks)) : null
    if (problemSolved !== undefined) updateData.problemSolved = problemSolved?.trim() || null
    if (keyContribution !== undefined) updateData.keyContribution = keyContribution?.trim() || null
    if (limitations !== undefined) updateData.limitations = limitations?.trim() || null
    if (literatureReview !== undefined) updateData.literatureReview = literatureReview ? (typeof literatureReview === 'string' ? literatureReview : JSON.stringify(literatureReview)) : null

    // Update tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      const tagNames = [...new Set(
        tags
          .filter((tagName): tagName is string => typeof tagName === 'string')
          .map((tagName) => tagName.trim().toLowerCase())
          .filter(Boolean)
      )]
      const tagConnectOrCreate = tagNames.map((cleanName) => {
        return {
          where: {
            userId_name: {
              userId: user.id,
              name: cleanName,
            },
          },
          create: {
            name: cleanName,
            userId: user.id,
          },
        }
      })

      // A paper can carry each collaborator's private tag taxonomy. Replace only
      // the current editor's tags and retain every tag created by other users.
      const collaboratorTags = existing.tags
        .filter((tag) => tag.userId !== user.id)
        .map((tag) => ({ id: tag.id }))

      updateData.tags = {
        set: collaboratorTags,
        connectOrCreate: tagConnectOrCreate,
      }
    }

    // Update collections if provided
    if (collections !== undefined && Array.isArray(collections)) {
      updateData.collections = {
        set: collections.map((colId: string) => ({ id: colId })),
      }
    }

    const updated = await prisma.paper.update({
      where: { id },
      data: updateData,
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        _count: { select: { notes: true } },
      },
    })

    // Synchronize corresponding Assignment status & notify Supervisor if assigned
    if (status !== undefined && user.systemRole === 'STUDENT') {
      const activeAssignment = existing.assignments.find(
        (assignment) => assignment.studentId === user.id
      )
      if (activeAssignment) {
        const newAssignmentStatus =
          status === 'COMPLETED'
            ? 'COMPLETED'
            : status === 'READING'
            ? 'IN_PROGRESS'
            : 'PENDING'

        await prisma.assignment.update({
          where: { id: activeAssignment.id },
          data: { status: newAssignmentStatus },
        })

        // If student completed paper, send real-time notification to the supervisor
        if (status === 'COMPLETED' && user.systemRole === 'STUDENT' && activeAssignment.assignedById) {
          try {
            await createNotification({
              userId: activeAssignment.assignedById,
              title: 'Reading Assignment Completed',
              message: `${user.name} finished reading assigned paper: "${existing.title}"`,
              type: 'STATUS_UPDATE',
              link: `/papers/${id}`,
            })
          } catch {
            // Notification is non-blocking
          }
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating paper:', error)
    return NextResponse.json({ error: 'Failed to update paper' }, { status: 500 })
  }
}

// DELETE /api/papers/[id] — Delete paper
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.paper.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = existing.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.paper.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting paper:', error)
    return NextResponse.json({ error: 'Failed to delete paper' }, { status: 500 })
  }
}
