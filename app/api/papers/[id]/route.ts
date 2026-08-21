import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { getUniquePaperSlug } from '@/lib/slug'

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

    // Check paper exists (lookup by cuid ID or human-readable slug)
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
            institution: true,
            supervisorId: true,
            labMemberships: {
              select: {
                labId: true,
                lab: {
                  select: {
                    id: true,
                    leadId: true,
                    members: { select: { userId: true, role: true } },
                  },
                },
              },
            },
          },
        },
        notes: {
          where: {
            OR: [
              { userId: user.id }, // Only author sees their own private notes
              { isPrivate: false }, // Everyone else only sees public notes
            ],
          },
          include: {
            user: { select: { id: true, name: true, systemRole: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            assignedBy: { select: { id: true, name: true, email: true } },
            student: { select: { id: true, name: true, email: true, department: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        shares: {
          include: {
            sharedBy: { select: { id: true, name: true, email: true } },
            sharedWith: { select: { id: true, name: true, email: true, department: true } },
          },
          orderBy: { createdAt: 'desc' },
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

    // Access check: Owner, Admin, Supervisor, Assigned Student, or Shared Peer
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)

    // Supervisor access: Owner, supervised student, or assigned by supervisor
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For assigned student researchers, strictly isolate their own assignment, notes, and synthesis,
    // while providing access to reviews shared with them by peer researchers.
    if (user.systemRole === 'STUDENT') {
      const studentAssignment = paper.assignments.find((a) => a.studentId === user.id)
      const sharedByUserIds = (paper.shares || [])
        .filter((s) => s.sharedWithId === user.id)
        .map((s) => s.sharedById)

      // Collect shared literature reviews from peers who shared with this student
      const sharedReviews = (paper.shares || [])
        .filter((s) => s.sharedWithId === user.id)
        .map((s) => {
          const sharerAssignment = paper.assignments.find((a) => a.studentId === s.sharedById)
          const reviewContent =
            sharerAssignment?.literatureReview || (paper.userId === s.sharedById ? paper.literatureReview : null)
          return {
            sharedById: s.sharedById,
            sharedByName: s.sharedBy?.name || 'Peer Researcher',
            permission: s.permission,
            literatureReview: reviewContent,
          }
        })
        .filter((sr) => Boolean(sr.literatureReview))

      // If student has their own assignment, use it.
      // Else if student is paper owner, use paper.literatureReview.
      // Else if paper was shared with this student, use the shared review!
      if (studentAssignment?.literatureReview) {
        paper.literatureReview = studentAssignment.literatureReview
      } else if (paper.userId === user.id) {
        paper.literatureReview = paper.literatureReview
      } else if (sharedReviews.length > 0) {
        paper.literatureReview = sharedReviews[0].literatureReview
      } else {
        paper.literatureReview = null
      }

      ;(paper as any).sharedReviews = sharedReviews
      paper.assignments = studentAssignment ? [studentAssignment] : []

      paper.notes = paper.notes.filter(
        (n) => n.userId === user.id || !n.isPrivate
      )
      paper.feedback = paper.feedback.filter(
        (f) => f.targetUserId === user.id || f.authorId === user.id || f.author?.systemRole !== 'STUDENT'
      )
    }

    // Attach current user's effective collaboration permissions
    const userShare = paper.shares?.find((s) => s.sharedWithId === user.id)
    const isDirectCollaborator = isOwner || isAdmin || isSupervisor || isAssigned
    const currentSharePermission = userShare ? (userShare.permission as 'VIEW' | 'COMMENT') : null
    const canComment = isDirectCollaborator || currentSharePermission === 'COMMENT'
    const canEdit = isDirectCollaborator || currentSharePermission === 'COMMENT'

    ;(paper as any).currentSharePermission = currentSharePermission
    ;(paper as any).canComment = canComment
    ;(paper as any).canEdit = canEdit

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
    const existing = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            systemRole: true,
            supervisorId: true,
            labMemberships: {
              select: {
                labId: true,
                lab: {
                  select: {
                    id: true,
                    leadId: true,
                    members: { select: { userId: true, role: true } },
                  },
                },
              },
            },
          },
        },
        assignments: true,
        shares: true,
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
      (isOwner ||
        existing.user?.supervisorId === user.id ||
        existing.assignments?.some((a) => a.assignedById === user.id))
    const activeAssignment = existing.assignments?.find((a) => a.studentId === user.id)
    const isAssigned = Boolean(activeAssignment)
    const isSharedWith = existing.shares?.some((s) => s.sharedWithId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If accessing strictly as a shared peer student, verify COMMENT permission
    if (isSharedWith && !isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      const userShare = existing.shares?.find((s) => s.sharedWithId === user.id)
      if (userShare?.permission !== 'COMMENT') {
        return NextResponse.json(
          { error: 'You have view-only access to this paper. Comment permission is required to make modifications.' },
          { status: 403 }
        )
      }
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

    // ─── 1. If user is an Assigned Student, ISOLATE literature review & status to Assignment ───
    if (user.systemRole === 'STUDENT' && activeAssignment) {
      const assignmentUpdateData: Record<string, unknown> = {}

      if (literatureReview !== undefined) {
        assignmentUpdateData.literatureReview = literatureReview
          ? typeof literatureReview === 'string'
            ? literatureReview
            : JSON.stringify(literatureReview)
          : null
      }

      if (status !== undefined) {
        assignmentUpdateData.status =
          status === 'COMPLETED'
            ? 'COMPLETED'
            : status === 'READING'
            ? 'IN_PROGRESS'
            : 'PENDING'
      }

      if (Object.keys(assignmentUpdateData).length > 0) {
        await prisma.assignment.update({
          where: { id: activeAssignment.id },
          data: assignmentUpdateData,
        })
      }

      // If student completed paper, send real-time notification to supervisor
      if (status === 'COMPLETED' && activeAssignment.assignedById) {
        try {
          await createNotification({
            userId: activeAssignment.assignedById,
            title: 'Reading Assignment Completed',
            message: `${user.name} finished reading and synthesizing assigned paper: "${existing.title}"`,
            type: 'STATUS_UPDATE',
            link: `/papers/${id}`,
          })
        } catch {
          // Notification is non-blocking
        }
      }

      // Return existing paper without mutating the supervisor's master library
      const freshPaper = await prisma.paper.findUnique({
        where: { id },
        include: {
          tags: true,
          collections: { select: { id: true, name: true, color: true } },
          assignments: {
            include: {
              assignedBy: { select: { id: true, name: true } },
              student: { select: { id: true, name: true } },
            },
          },
          _count: { select: { notes: true } },
        },
      })

      if (freshPaper) {
        // Return student's own literature review in the response
        if (literatureReview !== undefined) {
          freshPaper.literatureReview = typeof literatureReview === 'string' ? literatureReview : JSON.stringify(literatureReview)
        } else if (activeAssignment.literatureReview) {
          freshPaper.literatureReview = activeAssignment.literatureReview
        }
      }

      return NextResponse.json(freshPaper || existing)
    }

    // ─── 2. If user is Paper Owner / Supervisor / Admin, update Master Paper ───
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

    if (title && title.trim() !== existing.title) {
      updateData.slug = await getUniquePaperSlug(title.trim(), existing.id)
    } else if (!existing.slug) {
      updateData.slug = await getUniquePaperSlug(existing.title, existing.id)
    }

    const updated = await prisma.paper.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        assignments: {
          include: {
            assignedBy: { select: { id: true, name: true } },
            student: { select: { id: true, name: true } },
          },
        },
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
    const existing = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        user: { select: { id: true, supervisorId: true } },
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

    if (!isOwner && !isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paperId = existing.id

    // Safely remove related dependent records in a transaction
    await prisma.$transaction([
      prisma.note.deleteMany({ where: { paperId } }),
      prisma.assignment.deleteMany({ where: { paperId } }),
      prisma.feedback.deleteMany({ where: { paperId } }),
      prisma.reviewRubric.deleteMany({ where: { paperId } }),
      prisma.starterPackItem.deleteMany({ where: { paperId } }),
      prisma.journalClubSession.deleteMany({ where: { paperId } }),
      prisma.paper.delete({ where: { id: paperId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting paper:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete paper' }, { status: 500 })
  }
}

// PATCH /api/papers/[id] — Alias for PUT to support PATCH requests
export const PATCH = PUT

