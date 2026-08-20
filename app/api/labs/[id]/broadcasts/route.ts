import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id]/broadcasts — List announcements & conference countdowns
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params

    const broadcasts = await prisma.labBroadcast.findMany({
      where: {
        OR: [{ labId }, { lab: { slug: labId } }],
      },
      include: {
        author: { select: { id: true, name: true, email: true, systemRole: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(broadcasts)
  } catch (error) {
    console.error('Error fetching broadcasts:', error)
    return NextResponse.json({ error: 'Failed to fetch lab broadcasts' }, { status: 500 })
  }
}

// POST /api/labs/[id]/broadcasts — Post new announcement or conference countdown (Lead / Supervisor / Admin)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { title, content, category = 'ANNOUNCEMENT', deadline, isPinned = false } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    // Must be lab lead, supervisor, or admin
    if (lab.leadId !== user.id && user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only lab leads and supervisors can post broadcasts' }, { status: 403 })
    }

    let validDeadline: Date | null = null
    if (deadline && typeof deadline === 'string' && deadline.trim()) {
      const parsed = new Date(deadline.trim())
      if (!isNaN(parsed.getTime())) {
        validDeadline = parsed
      }
    }

    const broadcast = await prisma.labBroadcast.create({
      data: {
        labId: lab.id,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        category,
        deadline: validDeadline,
        isPinned: Boolean(isPinned),
      },
      include: {
        author: { select: { id: true, name: true, email: true, systemRole: true } },
      },
    })

    // Notify all members of the lab
    const labMembers = await prisma.labMember.findMany({
      where: { labId: lab.id },
    })

    for (const member of labMembers) {
      if (member.userId !== user.id) {
        await createNotification({
          userId: member.userId,
          title: `Lab Notice: ${lab.name} 📢`,
          message: `${user.name} posted: "${broadcast.title}"`,
          type: 'SYSTEM',
          link: `/labs/${lab.slug}`,
        })
      }
    }

    return NextResponse.json(broadcast, { status: 201 })
  } catch (error: any) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: error.message || 'Failed to create broadcast' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/broadcasts — Edit noticeboard announcement / message
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { broadcastId, title, content, category, deadline, isPinned } = body

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    const broadcast = await prisma.labBroadcast.findUnique({
      where: { id: broadcastId },
      include: { lab: true },
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast message not found' }, { status: 404 })
    }

    if (broadcast.authorId !== user.id && broadcast.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (title) updateData.title = title.trim()
    if (content) updateData.content = content.trim()
    if (category) updateData.category = category
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned)

    if (deadline !== undefined) {
      if (deadline && typeof deadline === 'string' && deadline.trim()) {
        const parsed = new Date(deadline.trim())
        if (!isNaN(parsed.getTime())) {
          updateData.deadline = parsed
        }
      } else {
        updateData.deadline = null
      }
    }

    const updated = await prisma.labBroadcast.update({
      where: { id: broadcastId },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, email: true, systemRole: true } },
      },
    })

    // Notify lab members of updated message
    const labMembers = await prisma.labMember.findMany({
      where: { labId: broadcast.labId },
    })

    for (const member of labMembers) {
      if (member.userId !== user.id) {
        await createNotification({
          userId: member.userId,
          title: `Updated Notice: ${broadcast.lab.name} 📢`,
          message: `${user.name} updated: "${updated.title}"`,
          type: 'SYSTEM',
          link: `/labs/${broadcast.lab.slug}`,
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating broadcast:', error)
    return NextResponse.json({ error: error.message || 'Failed to update broadcast' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/broadcasts — Delete announcement
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get('broadcastId')

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    const broadcast = await prisma.labBroadcast.findUnique({
      where: { id: broadcastId },
      include: { lab: true },
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    if (broadcast.authorId !== user.id && broadcast.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.labBroadcast.delete({
      where: { id: broadcastId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting broadcast:', error)
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 })
  }
}
