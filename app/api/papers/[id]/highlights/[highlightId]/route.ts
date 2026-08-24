import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string; highlightId: string }>
}

// DELETE /api/papers/[id]/highlights/[highlightId] — Delete a highlight and its comments
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { highlightId } = await params

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        paper: { select: { id: true, userId: true } },
      },
    })

    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 })
    }

    const isAuthor = highlight.userId === user.id
    const isPaperOwner = highlight.paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isAuthor && !isPaperOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own annotations' },
        { status: 403 }
      )
    }

    await prisma.highlightComment.deleteMany({
      where: { highlightId },
    })

    await prisma.highlight.delete({
      where: { id: highlightId },
    })

    return NextResponse.json({ success: true, message: 'Highlight deleted' })
  } catch (error: any) {
    console.error('Error deleting highlight:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete highlight' },
      { status: 500 }
    )
  }
}

// PATCH /api/papers/[id]/highlights/[highlightId] — Update highlight category or color
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { highlightId } = await params
    const body = await request.json()
    const { color, category, isPrivate } = body

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
    })

    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 })
    }

    if (highlight.userId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own annotations' },
        { status: 403 }
      )
    }

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: {
        ...(color ? { color } : {}),
        ...(category ? { category } : {}),
        ...(isPrivate !== undefined ? { isPrivate: Boolean(isPrivate) } : {}),
      },
      include: {
        user: { select: { id: true, name: true, systemRole: true, image: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, systemRole: true, image: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating highlight:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update highlight' },
      { status: 500 }
    )
  }
}
