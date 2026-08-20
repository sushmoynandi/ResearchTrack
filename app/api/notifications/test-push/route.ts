import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { sendPushNotification } from '@/lib/notifications'

// POST /api/notifications/test-push — Send a live test push notification to the current user's devices
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
    })

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        {
          error: 'No active device registered for push notifications on this account. Please click "Enable Push Alerts" on this device first.',
          hasSubscriptions: false,
        },
        { status: 400 }
      )
    }

    const timeStr = new Date().toLocaleTimeString()
    const title = '🧪 ResearchTrack Test Alert'
    const message = `Live push notification received on your device at ${timeStr}! System alerts and lab updates are active.`

    // Create in-app notification record
    await prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: 'SYSTEM',
        link: '/profile',
        isRead: false,
      },
    })

    // Dispatch background web push
    await sendPushNotification(user.id, {
      title,
      message,
      link: '/profile',
      type: 'SYSTEM',
    })

    return NextResponse.json({
      success: true,
      deviceCount: subscriptions.length,
      message: `Test push sent to ${subscriptions.length} registered device(s)! Check your system notification tray.`,
    })
  } catch (error: any) {
    console.error('Error sending test push:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test push notification' },
      { status: 500 }
    )
  }
}
