import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { recordAuditLog } from '@/lib/audit'
import { parseYouTubeId } from '@/lib/youtube'

const AUDIENCES = ['ALL', 'STUDENT', 'SUPERVISOR'] as const
type Audience = (typeof AUDIENCES)[number]

/** GET /api/admin/help-videos — every video, published or not (Admin only). */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  try {
    const videos = await prisma.helpVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Admin help video fetch error:', error)
    return NextResponse.json({ error: 'Could not load the videos' }, { status: 500 })
  }
}

/** POST /api/admin/help-videos — add a YouTube link (Admin only). */
export async function POST(request: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : ''
    const audience: Audience = AUDIENCES.includes(body.audience) ? body.audience : 'ALL'
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    const isPublished = body.isPublished !== false

    if (!title) {
      return NextResponse.json({ error: 'Give the video a title' }, { status: 400 })
    }

    const videoId = parseYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json(
        { error: 'That is not a YouTube link. Paste one like https://www.youtube.com/watch?v=...' },
        { status: 400 }
      )
    }

    const video = await prisma.helpVideo.create({
      data: {
        title,
        description: description || null,
        youtubeUrl,
        videoId,
        audience,
        sortOrder,
        isPublished,
        createdById: admin.id,
      },
    })

    await recordAuditLog({
      userId: admin.id,
      userName: admin.name,
      action: 'HELP_VIDEO_CREATED',
      resource: `helpVideo:${video.id}`,
      details: `${title} (${audience})`,
    })

    return NextResponse.json({ video }, { status: 201 })
  } catch (error) {
    console.error('Help video create error:', error)
    return NextResponse.json({ error: 'Could not save the video' }, { status: 500 })
  }
}
