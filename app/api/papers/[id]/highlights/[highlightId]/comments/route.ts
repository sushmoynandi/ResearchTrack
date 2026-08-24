import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string; highlightId: string }>
}

// POST /api/papers/[id]/highlights/[highlightId]/comments — Reply to a highlight comment thread
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId, highlightId } = await params
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 })
    }

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            slug: true,
            userId: true,
            user: { select: { id: true, supervisorId: true } },
            assignments: { select: { studentId: true, assignedById: true } },
            shares: { select: { sharedWithId: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    })

    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 })
    }

    const paper = highlight.paper
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
        { error: 'Forbidden: You do not have permission to comment on this highlight' },
        { status: 403 }
      )
    }

    const newComment = await prisma.highlightComment.create({
      data: {
        highlightId,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, systemRole: true, image: true },
        },
      },
    })

    // Notify the author of the highlight if someone else replied
    if (highlight.userId !== user.id) {
      await createNotification({
        userId: highlight.userId,
        title: 'New Reply on Highlight 💬',
        message: `${user.name} replied: "${content.trim().slice(0, 50)}..."`,
        type: 'FEEDBACK',
        link: `/papers/${paper.slug || paper.id}`,
      }).catch(() => {})
    }

    return NextResponse.json(newComment, { status: 201 })
  } catch (error: any) {
    console.error('Error adding highlight comment:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/papers/[id]/highlights/[highlightId]/comments — Delete a comment (by commentId in query/body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    const comment = await prisma.highlightComment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.userId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own comments' },
        { status: 403 }
      )
    }

    await prisma.highlightComment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ success: true, message: 'Comment deleted' })
  } catch (error: any) {
    console.error('Error deleting highlight comment:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
