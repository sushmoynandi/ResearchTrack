import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string; groupId: string }>
}

// POST /api/labs/[id]/groups/[groupId]/starter-pack/enroll — Student enrolls in group starter pack
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = await params

    const group = await prisma.researchGroup.findUnique({
      where: { id: groupId },
      include: {
        lab: true,
        starterPackItems: {
          include: { paper: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Research group not found' }, { status: 404 })
    }

    if (group.starterPackItems.length === 0) {
      return NextResponse.json({ error: 'This sub-group does not have any starter pack papers yet' }, { status: 400 })
    }

    let enrolledCount = 0

    for (const item of group.starterPackItems) {
      // Check if assignment exists
      const existingAssignment = await prisma.assignment.findUnique({
        where: {
          paperId_studentId: {
            paperId: item.paperId,
            studentId: user.id,
          },
        },
      })

      if (!existingAssignment) {
        await prisma.assignment.create({
          data: {
            paperId: item.paperId,
            studentId: user.id,
            assignedById: group.lab.leadId,
            note: item.note || `Syllabus paper from ${group.name} Starter Pack`,
            status: 'PENDING',
          },
        })
        enrolledCount++
      }
    }

    await createNotification({
      userId: user.id,
      title: `Enrolled in ${group.name} Starter Pack 📚`,
      message: `Added ${enrolledCount} foundational papers to your reading assignments queue.`,
      type: 'ASSIGNMENT',
      link: '/assignments',
    })

    return NextResponse.json({
      success: true,
      enrolledCount,
      totalPapers: group.starterPackItems.length,
      groupName: group.name,
    })
  } catch (error) {
    console.error('Error enrolling in starter pack:', error)
    return NextResponse.json({ error: 'Failed to enroll in starter pack' }, { status: 500 })
  }
}
