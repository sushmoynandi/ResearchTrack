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

    const adviceText = message?.trim() || `Your advisor ${user.name} sent you research advice. Check your paper reading queue and lab tasks!`

    await createNotification({
      userId: studentId,
      title: 'Advisor Research Advice 💡',
      message: adviceText,
      type: 'FEEDBACK',
      link: '/assignments',
    })

    return NextResponse.json({ success: true, message: 'Advice sent successfully' })
  } catch (error) {
    console.error('Error sending research nudge:', error)
    return NextResponse.json({ error: 'Failed to send research nudge' }, { status: 500 })
  }
}
