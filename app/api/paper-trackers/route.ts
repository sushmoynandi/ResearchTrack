import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { PAPER_TRACKER_STAGES } from '@/lib/paperTrackerStages'

// GET /api/paper-trackers — List trackers for user (owned, directly assigned, lab-shared, group-shared)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const status = searchParams.get('status')

    // Find lab memberships and group memberships of the user
    const [userLabMemberships, userGroupMemberships] = await Promise.all([
      prisma.labMember.findMany({
        where: { userId: user.id },
        select: { labId: true },
      }),
      prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      }),
    ])

    const userLabIds = userLabMemberships.map((m) => m.labId)
    const userGroupIds = userGroupMemberships.map((m) => m.groupId)

    // Labs led by the user if supervisor
    const ledLabs = await prisma.lab.findMany({
      where: { leadId: user.id },
      select: { id: true },
    })
    const allAccessibleLabIds = Array.from(new Set([...userLabIds, ...ledLabs.map((l) => l.id)]))

    // Build accessibility filter
    let whereCondition: any = {}

    if (user.systemRole === 'ADMIN') {
      whereCondition = {}
    } else if (user.systemRole === 'SUPERVISOR') {
      // Supervisors can see: trackers they own, trackers shared with them/their labs, AND trackers owned by students they supervise
      whereCondition = {
        OR: [
          { ownerId: user.id },
          { owner: { supervisorId: user.id } },
          { shares: { some: { userId: user.id } } },
          ...(allAccessibleLabIds.length > 0
            ? [{ shares: { some: { labId: { in: allAccessibleLabIds } } } }]
            : []),
          ...(userGroupIds.length > 0
            ? [{ shares: { some: { groupId: { in: userGroupIds } } } }]
            : []),
        ],
      }
    } else {
      // Students: can see trackers they own or that were explicitly shared with them (individually or via enrolled Lab/Group)
      whereCondition = {
        OR: [
          { ownerId: user.id },
          { shares: { some: { userId: user.id } } },
          ...(allAccessibleLabIds.length > 0
            ? [{ shares: { some: { labId: { in: allAccessibleLabIds } } } }]
            : []),
          ...(userGroupIds.length > 0
            ? [{ shares: { some: { groupId: { in: userGroupIds } } } }]
            : []),
        ],
      }
    }

    if (paperId) {
      whereCondition.papers = { some: { id: paperId } }
    }
    if (status) {
      whereCondition.status = status
    }

    const trackers = await prisma.paperTracker.findMany({
      where: whereCondition,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
            image: true,
          },
        },
        papers: {
          select: {
            id: true,
            title: true,
            authors: true,
            slug: true,
            status: true,
          },
        },
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true, systemRole: true },
            },
            lab: {
              select: { id: true, name: true, slug: true },
            },
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(trackers)
  } catch (error: any) {
    console.error('Error fetching paper trackers:', error)
    return NextResponse.json({ error: 'Failed to fetch paper trackers' }, { status: 500 })
  }
}

// POST /api/paper-trackers — Create new 25-stage Paper Tracker with multi-target sharing
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      targetVenue,
      targetDate,
      paperIds, // string[] (multi-select)
      paperId, // single fallback
      // Target Sharing
      studentIds, // string[]
      labIds, // string[]
      groupIds, // string[]
      permission = 'COLLABORATE',
      note,
    } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Tracker title is required' }, { status: 400 })
    }

    // Resolve list of paper IDs to connect
    const resolvedPaperIds: string[] = []
    if (Array.isArray(paperIds)) {
      for (const pId of paperIds) {
        if (pId && !resolvedPaperIds.includes(pId)) resolvedPaperIds.push(pId)
      }
    } else if (paperId && typeof paperId === 'string') {
      resolvedPaperIds.push(paperId)
    }

    // Prepare 25 steps initialization
    const stepsData = PAPER_TRACKER_STAGES.map((s) => ({
      stepIndex: s.index,
      stepKey: s.key,
      title: s.title,
      category: s.category,
      description: s.description,
      status: s.index === 1 ? 'IN_PROGRESS' : 'PENDING',
    }))

    // Prepare share targets
    const shareRecords: Array<{
      targetType: string
      userId?: string
      labId?: string
      groupId?: string
      permission: string
      note?: string
    }> = []

    // 1. Individual Students (multi-select)
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      for (const sId of studentIds) {
        if (sId && typeof sId === 'string' && sId !== user.id) {
          shareRecords.push({
            targetType: 'STUDENT',
            userId: sId,
            permission,
            note: note || undefined,
          })
        }
      }
    }

    // 2. Labs (multi-select)
    if (Array.isArray(labIds) && labIds.length > 0) {
      for (const lId of labIds) {
        if (lId && typeof lId === 'string') {
          shareRecords.push({
            targetType: 'LAB',
            labId: lId,
            permission,
            note: note || undefined,
          })
        }
      }
    }

    // 3. Sub-Groups (multi-select)
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gId of groupIds) {
        if (gId && typeof gId === 'string') {
          shareRecords.push({
            targetType: 'GROUP',
            groupId: gId,
            permission,
            note: note || undefined,
          })
        }
      }
    }

    // Create PaperTracker with 25 steps, linked papers, and shares in a transaction
    const tracker = await prisma.paperTracker.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        targetVenue: targetVenue?.trim() || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        ownerId: user.id,
        papers:
          resolvedPaperIds.length > 0
            ? {
                connect: resolvedPaperIds.map((id) => ({ id })),
              }
            : undefined,
        steps: {
          create: stepsData,
        },
        shares:
          shareRecords.length > 0
            ? {
                create: shareRecords,
              }
            : undefined,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, systemRole: true },
        },
        papers: {
          select: { id: true, title: true, authors: true, slug: true },
        },
        steps: {
          orderBy: { stepIndex: 'asc' },
        },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            lab: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Send notifications to directly assigned students
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      for (const sId of studentIds) {
        if (sId && sId !== user.id) {
          await createNotification({
            userId: sId,
            title: `📋 Research Tracker: ${tracker.title}`,
            message: `${user.name} added you to Paper Tracker "${tracker.title}".`,
            type: 'ASSIGNMENT',
            link: `/paper-tracker/${tracker.id}`,
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json(tracker, { status: 201 })
  } catch (error: any) {
    console.error('Error creating paper tracker:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create paper tracker' },
      { status: 500 }
    )
  }
}
