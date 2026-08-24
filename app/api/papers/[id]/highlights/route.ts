import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/highlights — Fetch all highlights and marginal comments for a paper
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
      include: {
        user: { select: { id: true, supervisorId: true } },
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

    // Highlight visibility:
    // Students see: their own highlights, paper owner's public highlights, supervisor's public highlights
    // Supervisors see: all highlights from students in their orbit or public highlights
    const highlightWhere: any = {
      paperId: paper.id,
    }

    if (user.systemRole === 'STUDENT' && !isOwner) {
      highlightWhere.OR = [
        { userId: user.id },
        { isPrivate: false },
      ]
    }

    const highlights = await prisma.highlight.findMany({
      where: highlightWhere,
      include: {
        user: {
          select: { id: true, name: true, email: true, systemRole: true, image: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, systemRole: true, image: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pageNumber: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(highlights)
  } catch (error: any) {
    console.error('Error fetching highlights:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch highlights' },
      { status: 500 }
    )
  }
}

// POST /api/papers/[id]/highlights — Create a text highlight & optional initial comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId } = await params
    const body = await request.json()
    const {
      text,
      color = 'YELLOW',
      category = 'METHODOLOGY',
      pageNumber = 1,
      position,
      isPrivate = false,
      initialComment,
    } = body

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Highlighted text snippet is required' }, { status: 400 })
    }

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
        { error: 'Forbidden: You do not have access to annotate this paper' },
        { status: 403 }
      )
    }

    const highlight = await prisma.highlight.create({
      data: {
        paperId: paper.id,
        userId: user.id,
        text: text.trim(),
        color,
        category,
        pageNumber: pageNumber ? Number(pageNumber) : 1,
        position: position ? (typeof position === 'string' ? position : JSON.stringify(position)) : null,
        isPrivate: Boolean(isPrivate),
        ...(initialComment && initialComment.trim()
          ? {
              comments: {
                create: {
                  userId: user.id,
                  content: initialComment.trim(),
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, systemRole: true, image: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, systemRole: true, image: true },
            },
          },
        },
      },
    })

    // Send notifications if supervisor comments on student paper or vice versa
    if (user.systemRole === 'SUPERVISOR' && paper.userId !== user.id) {
      await createNotification({
        userId: paper.userId,
        title: 'Advisor Highlight & Marginal Comment 🖍️',
        message: `${user.name} added a marginal note on "${paper.title.slice(0, 40)}..."`,
        type: 'FEEDBACK',
        link: `/papers/${paper.slug || paper.id}`,
      }).catch(() => {})
    } else if (user.systemRole === 'STUDENT' && paper.user?.supervisorId) {
      await createNotification({
        userId: paper.user.supervisorId,
        title: 'Student Reading Annotation 📝',
        message: `${user.name} highlighted a key section in "${paper.title.slice(0, 40)}..."`,
        type: 'FEEDBACK',
        link: `/papers/${paper.slug || paper.id}`,
      }).catch(() => {})
    }

    return NextResponse.json(highlight, { status: 201 })
  } catch (error: any) {
    console.error('Error creating highlight:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create highlight' },
      { status: 500 }
    )
  }
}
