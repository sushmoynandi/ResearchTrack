import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string; groupId: string }>
}

// GET /api/labs/[id]/groups/[groupId]/starter-pack — List starter pack papers
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    if (user.systemRole === 'STUDENT') {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })

      const group = await prisma.researchGroup.findUnique({
        where: { id: groupId },
        include: { lab: true },
      })

      if (!membership && group?.lab.leadId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this research sub-group.' }, { status: 403 })
      }
    }

    const items = await prisma.starterPackItem.findMany({
      where: { groupId },
      include: {
        paper: true,
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching starter pack:', error)
    return NextResponse.json({ error: 'Failed to fetch starter pack' }, { status: 500 })
  }
}

// POST /api/labs/[id]/groups/[groupId]/starter-pack — Add paper to sub-group starter pack
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId, groupId } = await params
    const body = await request.json()
    const { paperId, note, order } = body

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: { lab: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research group not found' }, { status: 404 })
    }

    const labMember = await prisma.labMember.findUnique({
      where: {
        labId_userId: {
          labId: group.labId,
          userId: user.id,
        },
      },
    })

    const isAuthorized =
      group.lab.leadId === user.id ||
      user.systemRole === 'SUPERVISOR' ||
      user.systemRole === 'ADMIN' ||
      labMember?.role === 'LEAD' ||
      labMember?.role === 'CO_LEAD'

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit starter packs in this research lab.' },
        { status: 403 }
      )
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Selected paper not found in library' }, { status: 404 })
    }

    const highest = await prisma.starterPackItem.findFirst({
      where: { groupId },
      orderBy: { order: 'desc' },
    })

    const newOrder = order !== undefined ? order : (highest?.order ?? -1) + 1

    const item = await prisma.starterPackItem.upsert({
      where: {
        groupId_paperId: {
          groupId,
          paperId,
        },
      },
      update: {
        note: note?.trim() || null,
        order: newOrder,
      },
      create: {
        groupId,
        paperId,
        note: note?.trim() || null,
        order: newOrder,
      },
      include: {
        paper: true,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    console.error('Error adding to starter pack:', error)
    return NextResponse.json({ error: error.message || 'Failed to add paper to starter pack' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/groups/[groupId]/starter-pack — Remove paper from starter pack
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const { groupId } = await params

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 })
    }

    await prisma.starterPackItem.delete({
      where: {
        groupId_paperId: {
          groupId,
          paperId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from starter pack:', error)
    return NextResponse.json({ error: 'Failed to remove from starter pack' }, { status: 500 })
  }
}
