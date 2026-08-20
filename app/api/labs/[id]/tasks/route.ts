import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id]/tasks — List all research tasks in the lab
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const assigneeId = searchParams.get('assigneeId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    const where: any = { labId: lab.id }
    if (groupId) where.groupId = groupId
    if (assigneeId) where.assigneeId = assigneeId
    if (status && status !== 'ALL') where.status = status
    if (category && category !== 'ALL') where.category = category

    const tasks = await prisma.labTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Error fetching lab tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch lab tasks' }, { status: 500 })
  }
}

// POST /api/labs/[id]/tasks — Create and assign a research task (Supervisor / Lab Lead / Admin)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: labId } = await params
    const body = await request.json()
    const {
      title,
      description,
      category = 'RESEARCH',
      priority = 'MEDIUM',
      groupId,
      assigneeId,
      assigneeIds,
      targetScope,
      dueDate,
      deliverableUrl,
      formattedTime,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id: labId }, { slug: labId }],
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    // Must be supervisor, lab lead, or admin
    if (lab.leadId !== user.id && user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only faculty supervisors and lab leads can assign tasks' },
        { status: 403 }
      )
    }

    let parsedDueDate: Date | null = null
    if (dueDate && typeof dueDate === 'string' && dueDate.trim()) {
      const d = new Date(dueDate.trim())
      if (!isNaN(d.getTime())) parsedDueDate = d
    }

    // Collect all target student assignee user IDs automatically based on scope
    let targetUserIds: string[] = []

    if (targetScope === 'ALL_LAB' || assigneeId === 'ALL_LAB') {
      const labMembers = await prisma.labMember.findMany({
        where: { labId: lab.id, userId: { not: user.id } },
        select: { userId: true },
      })
      targetUserIds = labMembers.map((m) => m.userId)
    } else if ((targetScope === 'SUB_GROUP' || assigneeId === 'ALL_GROUP') && groupId) {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: groupId, userId: { not: user.id } },
        select: { userId: true },
      })
      targetUserIds = groupMembers.map((m) => m.userId)
    } else if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      targetUserIds = assigneeIds.filter((id: string) => id && id !== user.id)
    } else if (assigneeId && assigneeId !== 'ALL_LAB' && assigneeId !== 'ALL_GROUP') {
      targetUserIds = [assigneeId]
    }

    if (targetUserIds.length === 0) {
      // If no specific student assignee, create one unassigned task for the lab / group
      const task = await prisma.labTask.create({
        data: {
          labId: lab.id,
          groupId: groupId || null,
          title: title.trim(),
          description: description?.trim() || null,
          category: category || 'RESEARCH',
          priority: priority || 'MEDIUM',
          status: 'TODO',
          dueDate: parsedDueDate,
          assigneeId: null,
          createdById: user.id,
          deliverableUrl: deliverableUrl?.trim() || null,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, department: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true, color: true } },
        },
      })
      return NextResponse.json(task, { status: 201 })
    }

    // Create an individual trackable task instance for each student and notify them
    const createdTasks = []
    const dueStr = formattedTime || (parsedDueDate ? parsedDueDate.toLocaleDateString() : '')
    const dueInfo = dueStr ? ` (Due: ${dueStr})` : ''

    for (const uid of targetUserIds) {
      const task = await prisma.labTask.create({
        data: {
          labId: lab.id,
          groupId: groupId || null,
          title: title.trim(),
          description: description?.trim() || null,
          category: category || 'RESEARCH',
          priority: priority || 'MEDIUM',
          status: 'TODO',
          dueDate: parsedDueDate,
          assigneeId: uid,
          createdById: user.id,
          deliverableUrl: deliverableUrl?.trim() || null,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, department: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true, color: true } },
        },
      })
      createdTasks.push(task)

      // Send instant notification and background push notification
      await createNotification({
        userId: uid,
        title: `New Lab Task: "${task.title}" 📋`,
        message: `${user.name} assigned you a research deliverable in ${lab.name}${dueInfo}.`,
        type: 'ASSIGNMENT',
        link: `/labs/${lab.slug}?tab=tasks`,
      })
    }

    return NextResponse.json(createdTasks.length === 1 ? createdTasks[0] : createdTasks, { status: 201 })
  } catch (error: any) {
    console.error('Error creating lab task:', error)
    return NextResponse.json({ error: error.message || 'Failed to create lab task' }, { status: 500 })
  }
}

// PUT /api/labs/[id]/tasks — Update task details, status, or deliverable links
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      taskId,
      title,
      description,
      category,
      priority,
      status,
      dueDate,
      assigneeId,
      groupId,
      deliverableUrl,
      progressNotes,
    } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const task = await prisma.labTask.findUnique({
      where: { id: taskId },
      include: {
        lab: true,
        assignee: true,
        createdBy: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const isAssignee = task.assigneeId === user.id
    const isCreator = task.createdById === user.id
    const isLabLead = task.lab.leadId === user.id
    const isSupervisorOrAdmin = user.systemRole === 'SUPERVISOR' || user.systemRole === 'ADMIN'

    if (!isAssignee && !isCreator && !isLabLead && !isSupervisorOrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}

    // Fields anyone assigned can update (status, deliverable link, progress notes)
    if (status !== undefined) updateData.status = status
    if (deliverableUrl !== undefined) updateData.deliverableUrl = deliverableUrl?.trim() || null
    if (progressNotes !== undefined) updateData.progressNotes = progressNotes?.trim() || null

    // Fields only supervisors/leads can update
    if (isCreator || isLabLead || isSupervisorOrAdmin) {
      if (title !== undefined) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      if (category !== undefined) updateData.category = category
      if (priority !== undefined) updateData.priority = priority
      if (groupId !== undefined) updateData.groupId = groupId || null
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null
      if (dueDate !== undefined) {
        if (dueDate && typeof dueDate === 'string' && dueDate.trim()) {
          const d = new Date(dueDate.trim())
          updateData.dueDate = isNaN(d.getTime()) ? null : d
        } else {
          updateData.dueDate = null
        }
      }
    }

    const updated = await prisma.labTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true, color: true } },
      },
    })

    // Notifications:
    // If student updated status / submitted deliverable, notify supervisor
    if (isAssignee && status && status !== task.status) {
      await createNotification({
        userId: task.createdById,
        title: `Task Status Update: "${updated.title}" 🚀`,
        message: `${user.name} updated the task status to ${status}.`,
        type: 'STATUS_UPDATE',
        link: `/labs/${task.lab.slug}?tab=tasks`,
      })
    }
    // If supervisor updated task or reassigned, notify student
    else if (!isAssignee && updated.assigneeId && updated.assigneeId !== user.id) {
      await createNotification({
        userId: updated.assigneeId,
        title: `Task Updated: "${updated.title}" 📝`,
        message: `${user.name} updated the task details / status to ${updated.status}.`,
        type: 'STATUS_UPDATE',
        link: `/labs/${task.lab.slug}?tab=tasks`,
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating lab task:', error)
    return NextResponse.json({ error: error.message || 'Failed to update lab task' }, { status: 500 })
  }
}

// DELETE /api/labs/[id]/tasks — Remove task (Supervisor / Lead / Admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const task = await prisma.labTask.findUnique({
      where: { id: taskId },
      include: { lab: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.createdById !== user.id && task.lab.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.labTask.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true, message: 'Task deleted' })
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 })
  }
}
