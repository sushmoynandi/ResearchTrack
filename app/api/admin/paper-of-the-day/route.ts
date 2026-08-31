import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { sendPaperOfTheDayEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const broadcasts = await prisma.paperOfTheDay.findMany({
      where,
      orderBy: { scheduledFor: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        recipients: {
          include: {
            user: {
              select: { id: true, name: true, email: true, systemRole: true },
            },
          },
        },
      },
      take: 50,
    })

    return NextResponse.json(broadcasts)
  } catch (error) {
    console.error('Error fetching Paper of the Day broadcasts:', error)
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      doi,
      title,
      authors,
      abstract,
      journal,
      year,
      url,
      pdfUrl,
      paperId,
      scheduledFor,
      sendNow,
      targetFilter,
      recipientUserIds,
    } = body

    if (!doi || !title || !authors) {
      return NextResponse.json({ error: 'DOI, Title, and Authors are required' }, { status: 400 })
    }

    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
    const scheduledDateTime = sendNow ? new Date() : new Date(scheduledFor || Date.now())

    let userQuery: any = { isActive: true }
    if (targetFilter === 'STUDENTS') {
      userQuery.systemRole = 'STUDENT'
    } else if (targetFilter === 'SUPERVISORS') {
      userQuery.systemRole = 'SUPERVISOR'
    } else if (targetFilter === 'CUSTOM' && Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      userQuery.id = { in: recipientUserIds }
    } else if (targetFilter === 'ALL') {
      userQuery.systemRole = { in: ['STUDENT', 'SUPERVISOR'] }
    }

    const recipients = await prisma.user.findMany({
      where: userQuery,
      select: { id: true, name: true, email: true, systemRole: true },
    })

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No active recipients found for selected filter' }, { status: 400 })
    }

    const potd = await prisma.paperOfTheDay.create({
      data: {
        doi: cleanDoi,
        title: title.trim(),
        authors: authors.trim(),
        abstract: abstract?.trim() || null,
        journal: journal?.trim() || null,
        year: year ? parseInt(year, 10) : null,
        url: url?.trim() || ('https://doi.org/' + cleanDoi),
        pdfUrl: pdfUrl?.trim() || null,
        paperId: paperId || null,
        scheduledFor: scheduledDateTime,
        status: sendNow ? 'SENT' : 'SCHEDULED',
        sentAt: sendNow ? new Date() : null,
        recipientCount: recipients.length,
        targetFilter: targetFilter || 'ALL',
        createdById: user.id,
        recipients: {
          create: recipients.map((r) => ({
            userId: r.id,
            email: r.email,
            sentAt: sendNow ? new Date() : null,
          })),
        },
      },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, name: true, email: true, systemRole: true } },
          },
        },
      },
    })

    if (sendNow) {
      const emailPromises = recipients.map((recipient) =>
        sendPaperOfTheDayEmail({
          toEmail: recipient.email,
          recipientName: recipient.name,
          paperTitle: potd.title,
          authors: potd.authors,
          doi: potd.doi,
          abstract: potd.abstract,
          journal: potd.journal,
          year: potd.year,
          paperUrl: potd.url,
          pdfUrl: potd.pdfUrl,
        }).catch((err) => console.error('Failed to send POTD email to ' + recipient.email + ':', err))
      )

      const notifPromises = recipients.map((recipient) =>
        createNotification({
          userId: recipient.id,
          title: '📰 Paper of the Day: "' + potd.title + '"',
          message: 'Featured research breakthrough by ' + potd.authors + '. Check today spotlight paper.',
          type: 'SYSTEM',
          link: potd.paperId ? ('/papers/' + potd.paperId) : (potd.url || '/papers'),
        }).catch(() => {})
      )

      await Promise.allSettled([...emailPromises, ...notifPromises])
    }

    return NextResponse.json(potd, { status: 201 })
  } catch (error) {
    console.error('Error creating Paper of the Day broadcast:', error)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}
