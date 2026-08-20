import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>
}

// PUT /api/papers/[id]/notes/[noteId] — Update a note
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { noteId } = await params
    const body = await request.json()
    const { content, isPrivate } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { content: content.trim() }
    if (isPrivate !== undefined) {
      updateData.isPrivate = Boolean(isPrivate)
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE /api/papers/[id]/notes/[noteId] — Delete a note
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { noteId } = await params

    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await prisma.note.delete({
      where: { id: noteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
