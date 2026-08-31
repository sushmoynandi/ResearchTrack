import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/paper-of-the-day/[id] — Delete or cancel scheduled broadcast
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const broadcast = await prisma.paperOfTheDay.findUnique({
      where: { id },
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Paper of the Day broadcast not found' }, { status: 404 })
    }

    await prisma.paperOfTheDay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Broadcast removed successfully' })
  } catch (error) {
    console.error('Error deleting Paper of the Day broadcast:', error)
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 })
  }
}
