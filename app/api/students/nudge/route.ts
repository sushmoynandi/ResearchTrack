import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Faculty supervisor access required' }, { status: 403 })
    }

    const body = await request.json()
    const { studentId, message } = body

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const nudgeText = message?.trim() || `Your advisor ${user.name} sent you an encouragement nudge. Check your reading queue and milestones!`

    await createNotification({
      userId: studentId,
      title: 'Advisor Research Nudge ⚡',
      message: nudgeText,
      type: 'FEEDBACK',
      link: '/assignments',
    })

    return NextResponse.json({ success: true, message: 'Nudge sent successfully' })
  } catch (error) {
    console.error('Error sending research nudge:', error)
    return NextResponse.json({ error: 'Failed to send research nudge' }, { status: 500 })
  }
}
