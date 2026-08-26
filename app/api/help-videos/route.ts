import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/help-videos
 * The published tutorial videos for whoever is signed in. A student never sees
 * a supervisor-only video and vice versa; anything marked ALL is shown to both.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }

    const audience =
      user.systemRole === 'SUPERVISOR' || user.systemRole === 'STUDENT'
        ? [{ audience: 'ALL' as const }, { audience: user.systemRole }]
        : [{ audience: 'ALL' as const }, { audience: 'STUDENT' as const }, { audience: 'SUPERVISOR' as const }]

    const videos = await prisma.helpVideo.findMany({
      where: { isPublished: true, OR: audience },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        videoId: true,
        audience: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Help video fetch error:', error)
    return NextResponse.json({ error: 'Could not load the tutorial videos' }, { status: 500 })
  }
}
