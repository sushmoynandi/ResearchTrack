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

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    const isLeadOrSupervisor =
      lab.leadId === user.id ||
      user.systemRole === 'SUPERVISOR' ||
      user.systemRole === 'ADMIN'

    const whereClause: any = {
      labId: lab.id,
    }

    // Regular members only see Whole Lab notices OR notices for subgroups they belong to
    if (!isLeadOrSupervisor) {
      whereClause.OR = [
        { groupId: null },
        { group: { members: { some: { userId: user.id } } } },
      ]
    }

    const broadcasts = await prisma.labBroadcast.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, email: true, systemRole: true } },
        group: { select: { id: true, name: true, color: true } },
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
    const { title, content, category = 'ANNOUNCEMENT', deadline, isPinned = false, groupId } = body

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

    // Must be lab lead, affiliated supervisor member, or admin
    const labMember = await prisma.labMember.findUnique({
      where: { labId_userId: { labId: lab.id, userId: user.id } },
    })
    const isLabLeadOrSupervisor =
      lab.leadId === user.id ||
      user.systemRole === 'ADMIN' ||
      Boolean(labMember && ['LEAD', 'CO_LEAD', 'SUPERVISOR'].includes(labMember.role))

    if (!isLabLeadOrSupervisor) {
      return NextResponse.json(
        { error: 'Forbidden: Only lab leads and affiliated supervisors can post notices' },
        { status: 403 }
      )
    }

    let targetGroupId: string | null = null
    let targetGroupName: string | null = null

    if (groupId && groupId !== 'all' && groupId !== '') {
      const group = await prisma.researchGroup.findFirst({
        where: { id: groupId, labId: lab.id },
      })
      if (group) {
        targetGroupId = group.id
        targetGroupName = group.name
      }
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
        groupId: targetGroupId,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        category,
        deadline: validDeadline,
        isPinned: Boolean(isPinned),
      },
      include: {
        author: { select: { id: true, name: true, email: true, systemRole: true } },
        group: { select: { id: true, name: true, color: true } },
      },
    })

    // Send notifications to the targeted audience
    if (targetGroupId) {
      // Subgroup members only
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: targetGroupId },
      })

      for (const gm of groupMembers) {
        if (gm.userId !== user.id) {
          await createNotification({
            userId: gm.userId,
            title: `Lab Notice (${targetGroupName}): ${lab.name} 📢`,
            message: `${user.name} posted to ${targetGroupName}: "${broadcast.title}"`,
            type: 'SYSTEM',
            link: `/labs/${lab.slug}`,
          })
        }
      }
    } else {
      // Whole lab members
      const labMembers = await prisma.labMember.findMany({
        where: { labId: lab.id },
      })

      for (const member of labMembers) {
        if (member.userId !== user.id) {
          await createNotification({
            userId: member.userId,
            title: `Lab Notice (Whole Lab): ${lab.name} 📢`,
            message: `${user.name} posted: "${broadcast.title}"`,
            type: 'SYSTEM',
            link: `/labs/${lab.slug}`,
          })
        }
      }
    }

    return NextResponse.json(broadcast, { status: 201 })
  } catch (error: any) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: error.message || 'Failed to create notice' }, { status: 500 })
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
    const { broadcastId, title, content, category, deadline, isPinned, groupId } = body

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    const broadcast = await prisma.labBroadcast.findUnique({
      where: { id: broadcastId },
      include: { lab: true },
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
    }

    if (broadcast.authorId !== user.id && broadcast.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (title) updateData.title = title.trim()
    if (content) updateData.content = content.trim()
    if (category) updateData.category = category
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned)

    if (groupId !== undefined) {
      if (groupId && groupId !== 'all' && groupId !== '') {
        const group = await prisma.researchGroup.findFirst({
          where: { id: groupId, labId: broadcast.labId },
        })
        updateData.groupId = group ? group.id : null
      } else {
        updateData.groupId = null
      }
    }

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
        group: { select: { id: true, name: true, color: true } },
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
    return NextResponse.json({ error: error.message || 'Failed to update notice' }, { status: 500 })
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
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 })
  }
}
