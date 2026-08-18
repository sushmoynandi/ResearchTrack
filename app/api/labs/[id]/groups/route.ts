import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id]/groups — List research sub-groups
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params

    const groups = await prisma.researchGroup.findMany({
      where: {
        OR: [{ labId }, { lab: { slug: labId } }],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, department: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching research groups:', error)
    return NextResponse.json({ error: 'Failed to fetch research groups' }, { status: 500 })
  }
}

// POST /api/labs/[id]/groups — Create a research sub-group (Supervisor / Lab Lead / Admin)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { name, description, color = 'cyan', memberUserIds = [] } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    // Permission check: Must be lab lead, supervisor, or admin
    if (lab.leadId !== user.id && user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead, supervisor, or administrator can create sub-groups' }, { status: 403 })
    }

    const group = await prisma.researchGroup.create({
      data: {
        labId: lab.id,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        members: {
          create: [
            // Add creator as lead member
            { userId: user.id, role: 'LEAD' },
            // Add other student members
            ...memberUserIds
              .filter((id: string) => id !== user.id)
              .map((id: string) => ({ userId: id, role: 'MEMBER' })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    // Send notifications to newly added members
    for (const memberId of memberUserIds) {
      if (memberId !== user.id) {
        await createNotification({
          userId: memberId,
          title: 'Added to Research Sub-Group 🔬',
          message: `${user.name} added you to research cluster: "${group.name}" in ${lab.name}`,
          type: 'SYSTEM',
          link: `/labs/${lab.slug}`,
        })
      }
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Error creating research group:', error)
    return NextResponse.json({ error: 'Failed to create research group' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/groups — Update group metadata and assign/remove student members
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const { groupId, name, description, color, memberUserIds } = body

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: {
        lab: true,
        members: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research group not found' }, { status: 404 })
    }

    // Permission check: Must be lab lead, supervisor, or admin
    if (group.lab.leadId !== user.id && user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead, supervisor, or administrator can manage group members' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color) updateData.color = color

    // Update metadata
    await prisma.researchGroup.update({
      where: { id: groupId },
      data: updateData,
    })

    // If memberUserIds is provided, update group membership
    if (Array.isArray(memberUserIds)) {
      const existingUserIds = new Set(group.members.map((m) => m.userId))
      const targetUserIds = new Set([user.id, ...memberUserIds]) // Ensure lab lead stays in group

      // Remove members not in target list
      const toRemove = group.members.filter((m) => !targetUserIds.has(m.userId) && m.userId !== group.lab.leadId)
      if (toRemove.length > 0) {
        await prisma.groupMember.deleteMany({
          where: {
            groupId,
            userId: { in: toRemove.map((m) => m.userId) },
          },
        })
      }

      // Add newly assigned members
      const toAdd = memberUserIds.filter((id: string) => !existingUserIds.has(id))
      for (const newUserId of toAdd) {
        await prisma.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId,
              userId: newUserId,
            },
          },
          update: { role: 'MEMBER' },
          create: {
            groupId,
            userId: newUserId,
            role: 'MEMBER',
          },
        })

        // Notify newly assigned student
        await createNotification({
          userId: newUserId,
          title: 'Assigned to Research Sub-Group 🔬',
          message: `${user.name} assigned you to research cluster: "${group.name}" in ${group.lab.name}`,
          type: 'SYSTEM',
          link: `/labs/${group.lab.slug}`,
        })
      }
    }

    const updatedGroup = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, department: true } },
          },
        },
      },
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Error updating research group:', error)
    return NextResponse.json({ error: 'Failed to update research group' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/groups — Delete a research sub-group
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: { lab: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research group not found' }, { status: 404 })
    }

    if (group.lab.leadId !== user.id && user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead, supervisor, or administrator can delete sub-groups' }, { status: 403 })
    }

    await prisma.researchGroup.delete({
      where: { id: groupId },
    })

    return NextResponse.json({ success: true, message: 'Research group dissolved' })
  } catch (error) {
    console.error('Error deleting research group:', error)
    return NextResponse.json({ error: 'Failed to delete research group' }, { status: 500 })
  }
}
