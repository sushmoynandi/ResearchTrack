import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/notes — List collaborative notes for an accessible paper
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
        user: { select: { id: true, systemRole: true, supervisorId: true } },
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
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notes = await prisma.note.findMany({
      where: {
        paperId: paper.id,
        OR: [
          { userId: user.id }, // Author sees their own private and public notes
          { isPrivate: false }, // Others (supervisors / peers) only see public notes
        ],
      },
      include: {
        user: { select: { id: true, name: true, systemRole: true } },
      },
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
    const { content, isPrivate } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Verify paper access (Owner, Admin, Supervisor, or Assigned Student)
    const paper = await prisma.paper.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          {
            OR: [
              { userId: user.id },
              { assignments: { some: { studentId: user.id } } },
              ...(user.systemRole === 'SUPERVISOR'
                ? [{ assignments: { some: { assignedById: user.id } } }]
                : []),
              ...(user.systemRole === 'ADMIN' ? [{}] : []),
            ],
          },
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
        isPrivate: Boolean(isPrivate),
        paperId: paper.id,
      },
      include: {
        user: { select: { id: true, name: true, systemRole: true } },
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
