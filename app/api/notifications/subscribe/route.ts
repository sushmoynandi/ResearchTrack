import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { VAPID_PUBLIC_KEY } from '@/lib/webPush'

// GET /api/notifications/subscribe — Fetch the public VAPID key
export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
  })
}

// POST /api/notifications/subscribe — Save a device push subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys, userAgent } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Invalid push subscription payload' },
        { status: 400 }
      )
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || request.headers.get('user-agent') || null,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || request.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Background push notifications activated for this device!',
    })
  } catch (error: any) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/subscribe — Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint,
          userId: user.id,
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Push notifications disabled' })
  } catch (error: any) {
    console.error('Error deleting push subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
