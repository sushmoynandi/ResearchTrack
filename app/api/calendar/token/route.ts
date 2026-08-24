import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getWebcalFeedUrl, getGoogleCalendarFeedSubscribeUrl } from '@/lib/calendarSync'

// GET /api/calendar/token — Get current user's live calendar subscription feed token & URLs
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, calendarFeedToken: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Auto-generate token if not present
    if (!user.calendarFeedToken) {
      const newToken = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      user = await prisma.user.update({
        where: { id: user.id },
        data: { calendarFeedToken: newToken },
        select: { id: true, calendarFeedToken: true },
      })
    }

    const token = user.calendarFeedToken!
    const origin = request.nextUrl.origin
    const webcalUrl = getWebcalFeedUrl(token, origin)
    const googleCalendarSubscribeUrl = getGoogleCalendarFeedSubscribeUrl(token, origin)

    return NextResponse.json({
      token,
      webcalUrl,
      googleCalendarSubscribeUrl,
      httpFeedUrl: `${origin}/api/calendar/feed?token=${token}`,
    })
  } catch (error: any) {
    console.error('Error fetching calendar token:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar subscription link' }, { status: 500 })
  }
}

// POST /api/calendar/token — Reset calendar feed token
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newToken = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { calendarFeedToken: newToken },
      select: { id: true, calendarFeedToken: true },
    })

    const origin = request.nextUrl.origin
    const webcalUrl = getWebcalFeedUrl(newToken, origin)
    const googleCalendarSubscribeUrl = getGoogleCalendarFeedSubscribeUrl(newToken, origin)

    return NextResponse.json({
      message: 'Calendar subscription feed token regenerated successfully',
      token: newToken,
      webcalUrl,
      googleCalendarSubscribeUrl,
      httpFeedUrl: `${origin}/api/calendar/feed?token=${newToken}`,
    })
  } catch (error: any) {
    console.error('Error resetting calendar token:', error)
    return NextResponse.json({ error: 'Failed to reset calendar feed token' }, { status: 500 })
  }
}
