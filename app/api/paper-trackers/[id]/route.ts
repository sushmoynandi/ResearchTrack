import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/paper-trackers/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const tracker = await prisma.paperTracker.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
            image: true,
            institution: true,
            department: true,
            supervisorId: true,
          },
        },
        papers: {
          select: {
            id: true,
            title: true,
            authors: true,
            slug: true,
            status: true,
            journal: true,
            publicationYear: true,
            pdfPath: true,
          },
        },
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true, systemRole: true, image: true },
            },
            lab: {
              select: { id: true, name: true, slug: true, institution: true },
            },
            group: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Paper tracker not found' }, { status: 404 })
    }

    // Access check: Owner, student's supervisor, explicitly shared user, member of shared lab/group, or system admin
    const isOwner = tracker.ownerId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisorOfOwner = user.systemRole === 'SUPERVISOR' && tracker.owner?.supervisorId === user.id
    const isDirectlyShared = tracker.shares.some((s) => s.userId === user.id)

    // Check lab/group share
    let isLabOrGroupShared = false
    if (tracker.shares.some((s) => s.labId || s.groupId)) {
      const userLabs = await prisma.labMember.findMany({
        where: { userId: user.id },
        select: { labId: true },
      })
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      })
      const userLabIds = userLabs.map((l) => l.labId)
      const userGroupIds = userGroups.map((g) => g.groupId)

      // Also check led labs if user is supervisor
      const ledLabs = await prisma.lab.findMany({
        where: { leadId: user.id },
        select: { id: true },
      })
      const allAccessibleLabIds = [...userLabIds, ...ledLabs.map((l) => l.id)]

      isLabOrGroupShared = tracker.shares.some(
        (s) => (s.labId && allAccessibleLabIds.includes(s.labId)) || (s.groupId && userGroupIds.includes(s.groupId))
      )
    }

    if (!isOwner && !isAdmin && !isSupervisorOfOwner && !isDirectlyShared && !isLabOrGroupShared) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this paper tracker' }, { status: 403 })
    }

    return NextResponse.json(tracker)
  } catch (error: any) {
    console.error('Error fetching paper tracker:', error)
    return NextResponse.json({ error: 'Failed to fetch paper tracker' }, { status: 500 })
  }
}

// PATCH /api/paper-trackers/[id] — Update tracker metadata or add share targets
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const tracker = await prisma.paperTracker.findUnique({
      where: { id },
      include: { shares: true },
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Paper tracker not found' }, { status: 404 })
    }

    const isOwner = tracker.ownerId === user.id
    const isAdmin = user.systemRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only the owner or administrator can edit tracker properties' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      targetVenue,
      targetDate,
      status,
      paperIds,
      permission = 'COLLABORATE',
      // Adding new shares
      newStudentIds,
      newLabIds,
      newGroupIds,
      // Remove share target
      removeShareId,
    } = body

    const updateData: any = {}
    if (typeof title === 'string') updateData.title = title.trim()
    if (typeof description === 'string' || description === null) updateData.description = description
    if (typeof targetVenue === 'string' || targetVenue === null) updateData.targetVenue = targetVenue
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null
    if (typeof status === 'string') updateData.status = status
    if (Array.isArray(paperIds)) {
      updateData.papers = {
        set: paperIds.map((id: string) => ({ id })),
      }
    }

    // Handle removing existing share
    if (removeShareId && typeof removeShareId === 'string') {
      await prisma.paperTrackerShare.deleteMany({
        where: { id: removeShareId, trackerId: id },
      })
    }

    // Handle added shares if specified
    if (Array.isArray(newStudentIds) || Array.isArray(newLabIds) || Array.isArray(newGroupIds)) {
      const shareCreates: any[] = []
      if (Array.isArray(newStudentIds)) {
        for (const sId of newStudentIds) {
          if (sId && !tracker.shares.some((s) => s.userId === sId)) {
            shareCreates.push({ trackerId: id, targetType: 'STUDENT', userId: sId, permission })
          }
        }
      }
      if (Array.isArray(newLabIds)) {
        for (const lId of newLabIds) {
          if (lId && !tracker.shares.some((s) => s.labId === lId)) {
            shareCreates.push({ trackerId: id, targetType: 'LAB', labId: lId, permission })
          }
        }
      }
      if (Array.isArray(newGroupIds)) {
        for (const gId of newGroupIds) {
          if (gId && !tracker.shares.some((s) => s.groupId === gId)) {
            shareCreates.push({ trackerId: id, targetType: 'GROUP', groupId: gId, permission })
          }
        }
      }
      if (shareCreates.length > 0) {
        await prisma.paperTrackerShare.createMany({ data: shareCreates })
      }
    }

    const updated = await prisma.paperTracker.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        papers: { select: { id: true, title: true, authors: true, slug: true } },
        steps: { orderBy: { stepIndex: 'asc' } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            lab: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating paper tracker:', error)
    return NextResponse.json({ error: 'Failed to update paper tracker' }, { status: 500 })
  }
}

// DELETE /api/paper-trackers/[id] — Delete tracker
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const tracker = await prisma.paperTracker.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Paper tracker not found' }, { status: 404 })
    }

    if (tracker.ownerId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the owner or administrator can delete this tracker' }, { status: 403 })
    }

    await prisma.paperTracker.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Paper tracker deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting paper tracker:', error)
    return NextResponse.json({ error: 'Failed to delete paper tracker' }, { status: 500 })
  }
}
