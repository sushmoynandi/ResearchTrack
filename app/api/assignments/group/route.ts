import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

// POST /api/assignments/group — Assign paper to all members of a research group
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only faculty supervisors can assign reading' }, { status: 403 })
    }

    const body = await request.json()
    const { paperId, groupId, dueDate, note } = body

    if (!paperId || !groupId) {
      return NextResponse.json({ error: 'Paper ID and Research Group ID are required' }, { status: 400 })
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research Group not found' }, { status: 404 })
    }

    // Filter out the supervisor (only assign to students)
    const studentMembers = group.members.filter((m) => m.userId !== user.id)

    if (studentMembers.length === 0) {
      return NextResponse.json({ error: 'No student members found in this research group' }, { status: 400 })
    }

    let createdCount = 0

    for (const member of studentMembers) {
      // Check if assignment already exists
      const existing = await prisma.assignment.findUnique({
        where: {
          paperId_studentId: {
            paperId,
            studentId: member.userId,
          },
        },
      })

      if (!existing) {
        await prisma.assignment.create({
          data: {
            paperId,
            studentId: member.userId,
            assignedById: user.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            note: note?.trim() || `Group assignment for ${group.name}`,
            status: 'PENDING',
          },
        })
        createdCount++

        // Send notification
        await createNotification({
          userId: member.userId,
          title: `Group Literature Assigned: ${group.name} 🔬`,
          message: `${user.name} assigned your research cluster "${group.name}": "${paper.title}"`,
          type: 'ASSIGNMENT',
          link: `/papers/${paperId}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      groupName: group.name,
      assignedCount: createdCount,
      totalMembers: studentMembers.length,
    })
  } catch (error) {
    console.error('Error creating group assignment:', error)
    return NextResponse.json({ error: 'Failed to create group assignment' }, { status: 500 })
  }
}
