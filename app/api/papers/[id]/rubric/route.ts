import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/papers/[id]/rubric — Fetch rubric evaluation for specific student
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const targetStudentId = searchParams.get('studentId')

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { id: true, userId: true },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const whereCondition: Record<string, unknown> = {
      paperId: paper.id,
    }

    if (user.systemRole === 'STUDENT') {
      whereCondition.studentId = user.id
    } else if (targetStudentId) {
      whereCondition.studentId = targetStudentId
    }

    const rubric = await prisma.reviewRubric.findFirst({
      where: whereCondition,
      include: {
        supervisor: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rubric || null)
  } catch (error) {
    console.error('Error fetching rubric:', error)
    return NextResponse.json({ error: 'Failed to fetch review rubric' }, { status: 500 })
  }
}

// POST /api/papers/[id]/rubric — Submit or update faculty rubric evaluation for a specific student
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only faculty supervisors can submit rubrics' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      studentId,
      problemScore = 3,
      methodologyScore = 3,
      empiricalScore = 3,
      synthesisScore = 3,
      verdict = 'APPROVED',
      feedbackSummary,
    } = body

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        assignments: { select: { studentId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const targetStudentId = studentId || paper.assignments[0]?.studentId || paper.userId

    const rubric = await prisma.reviewRubric.create({
      data: {
        paperId: paper.id,
        supervisorId: user.id,
        studentId: targetStudentId,
        problemScore: Number(problemScore),
        methodologyScore: Number(methodologyScore),
        empiricalScore: Number(empiricalScore),
        synthesisScore: Number(synthesisScore),
        verdict,
        feedbackSummary: feedbackSummary?.trim() || null,
      },
      include: {
        supervisor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    })

    // Send notification to student researcher
    await createNotification({
      userId: targetStudentId,
      title: 'Faculty Evaluation Received',
      message: `${user.name} posted a formal Review Scorecard for "${paper.title}" (Verdict: ${verdict.replace('_', ' ')})`,
      type: 'FEEDBACK',
      link: `/papers/${paper.slug || paper.id}`,
    })

    return NextResponse.json(rubric, { status: 201 })
  } catch (error) {
    console.error('Error submitting rubric:', error)
    return NextResponse.json({ error: 'Failed to submit review rubric' }, { status: 500 })
  }
}
