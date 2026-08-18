import { prisma } from '@/lib/prisma'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: 'ASSIGNMENT' | 'FEEDBACK' | 'STATUS_UPDATE' | 'SYSTEM'
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'ASSIGNMENT',
        link: params.link || null,
        isRead: false,
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
    return null
  }
}
