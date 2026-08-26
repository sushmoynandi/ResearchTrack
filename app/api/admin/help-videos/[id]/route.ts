import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { recordAuditLog } from '@/lib/audit'
import { parseYouTubeId } from '@/lib/youtube'

const AUDIENCES = ['ALL', 'STUDENT', 'SUPERVISOR'] as const

/** PATCH /api/admin/help-videos/[id] — edit a video (Admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.helpVideo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (!title) return NextResponse.json({ error: 'Give the video a title' }, { status: 400 })
      data.title = title
    }
    if (typeof body.description === 'string') {
      data.description = body.description.trim() || null
    }
    if (typeof body.youtubeUrl === 'string') {
      const youtubeUrl = body.youtubeUrl.trim()
      const videoId = parseYouTubeId(youtubeUrl)
      if (!videoId) {
        return NextResponse.json(
          { error: 'That is not a YouTube link. Paste one like https://www.youtube.com/watch?v=...' },
          { status: 400 }
        )
      }
      data.youtubeUrl = youtubeUrl
      data.videoId = videoId
    }
    if (AUDIENCES.includes(body.audience)) data.audience = body.audience
    if (Number.isFinite(Number(body.sortOrder))) data.sortOrder = Number(body.sortOrder)
    if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished

    const video = await prisma.helpVideo.update({ where: { id }, data })

    await recordAuditLog({
      userId: admin.id,
      userName: admin.name,
      action: 'HELP_VIDEO_UPDATED',
      resource: `helpVideo:${id}`,
      details: video.title,
    })

    return NextResponse.json({ video })
  } catch (error) {
    console.error('Help video update error:', error)
    return NextResponse.json({ error: 'Could not save your changes' }, { status: 500 })
  }
}

/** DELETE /api/admin/help-videos/[id] — remove a video (Admin only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  try {
    const { id } = await params
    const existing = await prisma.helpVideo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    await prisma.helpVideo.delete({ where: { id } })

    await recordAuditLog({
      userId: admin.id,
      userName: admin.name,
      action: 'HELP_VIDEO_DELETED',
      resource: `helpVideo:${id}`,
      details: existing.title,
      severity: 'WARNING',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Help video delete error:', error)
    return NextResponse.json({ error: 'Could not delete the video' }, { status: 500 })
  }
}
