import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/collections/[id]/papers — Add a paper to a collection
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { paperId } = body

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    const collection = await prisma.collection.findFirst({
      where: { id, userId: user.id },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        user: { select: { supervisorId: true } },
        assignments: { select: { studentId: true } },
        shares: { select: { sharedWithId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (paper.userId === user.id || paper.user.supervisorId === user.id)
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)
    const isShared = paper.shares.some((share) => share.sharedWithId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isShared) {
      return NextResponse.json({ error: 'Unauthorized to add this paper' }, { status: 403 })
    }

    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        papers: { connect: { id: paperId } },
      },
      include: {
        _count: { select: { papers: true } },
      },
    })

    return NextResponse.json(updatedCollection)
  } catch (error) {
    console.error('Error adding paper to collection:', error)
    return NextResponse.json(
      { error: 'Failed to add paper to collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id]/papers — Remove a paper from a collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { paperId } = body

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    const collection = await prisma.collection.findFirst({
      where: { id, userId: user.id },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    await prisma.collection.update({
      where: { id },
      data: {
        papers: { disconnect: { id: paperId } },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing paper from collection:', error)
    return NextResponse.json(
      { error: 'Failed to remove paper from collection' },
      { status: 500 }
    )
  }
}
