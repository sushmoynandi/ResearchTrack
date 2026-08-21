import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/shares — List peers this paper is shared with
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        assignments: { select: { studentId: true, assignedById: true } },
        shares: {
          include: {
            sharedWith: {
              select: { id: true, name: true, email: true, image: true, department: true, institution: true },
            },
            sharedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner || paper.assignments.some((a) => a.assignedById === user.id))
    const isAssigned = paper.assignments.some((a) => a.studentId === user.id)
    const isShared = paper.shares.some((s) => s.sharedWithId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isShared) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(paper.shares)
  } catch (error) {
    console.error('Error fetching paper shares:', error)
    return NextResponse.json({ error: 'Failed to fetch paper shares' }, { status: 500 })
  }
}

// POST /api/papers/[id]/shares — Share paper with a peer student
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { sharedWithId, permission = 'VIEW', note } = body

    if (!sharedWithId) {
      return NextResponse.json({ error: 'Recipient student is required' }, { status: 400 })
    }

    if (sharedWithId === user.id) {
      return NextResponse.json({ error: 'You cannot share a paper with yourself' }, { status: 400 })
    }

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        assignments: { select: { studentId: true, assignedById: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner || paper.assignments.some((a) => a.assignedById === user.id))
    const isAssigned = paper.assignments.some((a) => a.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden to share this paper' }, { status: 403 })
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: sharedWithId },
      select: { id: true, name: true, email: true },
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const share = await prisma.paperShare.upsert({
      where: {
        paperId_sharedWithId: {
          paperId: paper.id,
          sharedWithId,
        },
      },
      update: {
        sharedById: user.id,
        permission: permission === 'COMMENT' ? 'COMMENT' : 'VIEW',
        note: note?.trim() || null,
      },
      create: {
        paperId: paper.id,
        sharedById: user.id,
        sharedWithId,
        permission: permission === 'COMMENT' ? 'COMMENT' : 'VIEW',
        note: note?.trim() || null,
      },
      include: {
        sharedWith: {
          select: { id: true, name: true, email: true, image: true, department: true },
        },
        sharedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Send in-app notification to the peer student
    await createNotification({
      userId: sharedWithId,
      title: 'Paper Shared with You 🤝',
      message: `${user.name} shared the research paper "${paper.title}" with you.`,
      type: 'SYSTEM',
      link: `/papers/${paper.slug || paper.id}`,
    })

    return NextResponse.json(share, { status: 201 })
  } catch (error) {
    console.error('Error sharing paper:', error)
    return NextResponse.json({ error: 'Failed to share paper' }, { status: 500 })
  }
}

// DELETE /api/papers/[id]/shares — Revoke peer share
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')
    const sharedWithId = searchParams.get('sharedWithId')

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        assignments: { select: { studentId: true, assignedById: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner || paper.assignments.some((a) => a.assignedById === user.id))

    const share = await prisma.paperShare.findFirst({
      where: {
        paperId: paper.id,
        ...(shareId ? { id: shareId } : {}),
        ...(sharedWithId ? { sharedWithId } : {}),
      },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share record not found' }, { status: 404 })
    }

    // Only share initiator, paper owner, supervisor, or the recipient themselves can revoke
    if (
      share.sharedById !== user.id &&
      share.sharedWithId !== user.id &&
      !isOwner &&
      !isAdmin &&
      !isSupervisor
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.paperShare.delete({
      where: { id: share.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking paper share:', error)
    return NextResponse.json({ error: 'Failed to revoke paper share' }, { status: 500 })
  }
}
