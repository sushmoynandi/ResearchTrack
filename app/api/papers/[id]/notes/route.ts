import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/notes — List all notes for a paper belonging to current user
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const notes = await prisma.note.findMany({
      where: { paperId: id, userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST /api/papers/[id]/notes — Create a note for a paper
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Verify paper access (Owner, Admin, Supervisor, or Assigned Student)
    const paper = await prisma.paper.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { assignments: { some: { studentId: user.id } } },
          ...(user.systemRole === 'SUPERVISOR' ? [{ user: { supervisorId: user.id } }] : []),
          ...(user.systemRole === 'ADMIN' ? [{}] : []),
        ],
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        content: content.trim(),
        paperId: id,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
