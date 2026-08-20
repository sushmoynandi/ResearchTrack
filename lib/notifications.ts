import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/webPush'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: 'ASSIGNMENT' | 'FEEDBACK' | 'STATUS_UPDATE' | 'SYSTEM'
  link?: string
}

/**
 * Dispatch real-time background Web Push Notification to all active mobile devices & browsers for a user.
 */
export async function sendPushNotification(
  userId: string,
  payload: { title: string; message: string; link?: string; type?: string }
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    })

    if (!subscriptions || subscriptions.length === 0) {
      return
    }

    const stringifiedPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      link: payload.link || '/',
      type: payload.type || 'SYSTEM',
      timestamp: Date.now(),
    })

    // Send push notification to all user's registered devices (phones, tablets, PCs)
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        await webpush.sendNotification(pushSubscription, stringifiedPayload, {
          TTL: 86400,
          urgency: 'high',
        })
      } catch (err: any) {
        // If subscription is expired or unregistered (HTTP 404 or 410 Gone), automatically clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription
            .delete({
              where: { id: sub.id },
            })
            .catch(() => {})
        } else {
          console.warn('Push notification delivery notice for device:', err.message || err)
        }
      }
    })

    await Promise.allSettled(sendPromises)
  } catch (error) {
    console.error('Error dispatching background push notification:', error)
  }
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'ASSIGNMENT',
        link: params.link || null,
        isRead: false,
      },
    })

    // Asynchronously dispatch background Web Push to student/user mobile phones & devices
    sendPushNotification(params.userId, {
      title: params.title,
      message: params.message,
      link: params.link,
      type: params.type,
    }).catch((err) => console.warn('Async push notice:', err))

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    return null
  }
}
