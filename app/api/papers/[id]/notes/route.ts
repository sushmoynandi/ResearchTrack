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
        shares: { select: { sharedById: true, sharedWithId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.userId === user.id ||
        paper.user?.supervisorId === user.id ||
        paper.assignments.some((a) => a.assignedById === user.id))
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(_request.url)
    const targetStudentId = searchParams.get('studentId')

    let notesWhere: Record<string, unknown> = {}

    if (user.systemRole === 'STUDENT') {
      const sharedByUserIds = (paper.shares || [])
        .filter((s) => s.sharedWithId === user.id)
        .map((s) => s.sharedById)

      // Student only sees:
      // 1. Their own notes (public or private)
      // 2. Public notes (isPrivate: false) from peers who shared with this student
      // 3. Public notes (isPrivate: false) from faculty/supervisors
      // Private notes from any other user are NEVER returned.
      notesWhere = {
        paperId: paper.id,
        OR: [
          { userId: user.id },
          {
            isPrivate: false,
            userId: { in: sharedByUserIds },
          },
          {
            isPrivate: false,
            user: { systemRole: { in: ['SUPERVISOR' as const, 'ADMIN' as const] } },
          },
        ],
      }
    } else if (targetStudentId) {
      // Supervisor inspecting a specific student's workspace
      notesWhere = {
        paperId: paper.id,
        OR: [
          { userId: user.id }, // Supervisor's own notes
          { userId: targetStudentId, isPrivate: false }, // Target student's public notes
          { user: { systemRole: { in: ['SUPERVISOR' as const, 'ADMIN' as const] } }, isPrivate: false },
        ],
      }
    } else {
      // Supervisor general view
      notesWhere = {
        paperId: paper.id,
        OR: [
          { userId: user.id }, // Own notes
          { isPrivate: false }, // Public notes from students & faculty
        ],
      }
    }

    const notes = await prisma.note.findMany({
      where: notesWhere,
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

    // Verify paper access (Owner, Admin, Supervisor, Assigned Student, or Shared Peer)
    const paper = await prisma.paper.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          {
            OR: [
              { userId: user.id },
              { assignments: { some: { studentId: user.id } } },
              { shares: { some: { sharedWithId: user.id } } },
              ...(user.systemRole === 'SUPERVISOR'
                ? [
                    { assignments: { some: { assignedById: user.id } } },
                    { user: { supervisorId: user.id } },
                  ]
                : []),
              ...(user.systemRole === 'ADMIN' ? [{}] : []),
            ],
          },
        ],
      },
      include: {
        user: { select: { supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
        shares: { select: { sharedWithId: true, permission: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a: { assignedById: string }) => a.assignedById === user.id))
    const isAssigned = paper.assignments?.some((a: { studentId: string }) => a.studentId === user.id)

    // If accessing solely via share, verify COMMENT permission
    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      const userShare = paper.shares?.find((s: { sharedWithId: string }) => s.sharedWithId === user.id)
      if (!userShare || userShare.permission !== 'COMMENT') {
        return NextResponse.json(
          { error: 'You have view-only access to this paper. Comment permission is required to add notes & annotations.' },
          { status: 403 }
        )
      }
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
