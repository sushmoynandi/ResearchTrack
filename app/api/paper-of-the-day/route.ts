import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { sendPaperOfTheDayEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

// GET /api/paper-of-the-day — Fetch current active Paper of the Day spotlight
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const now = new Date()

    // 1. Proactively process any due scheduled broadcasts
    const dueBroadcasts = await prisma.paperOfTheDay.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, name: true, email: true, systemRole: true } },
          },
        },
      },
      take: 5,
    })

    if (dueBroadcasts.length > 0) {
      for (const potd of dueBroadcasts) {
        const parsedTopics = potd.topics ? potd.topics.split(',').map((t) => t.trim()) : null
        
        for (const r of potd.recipients) {
          try {
            const success = await sendPaperOfTheDayEmail({
              toEmail: r.email,
              recipientName: r.user?.name || 'Scholar',
              paperTitle: potd.title,
              authors: potd.authors,
              doi: potd.doi,
              abstract: potd.abstract,
              journal: potd.journal,
              year: potd.year,
              paperUrl: potd.url,
              pdfUrl: potd.pdfUrl,
              score: potd.score,
              topics: parsedTopics,
              theme: potd.theme,
            })

            if (success) {
              await prisma.paperOfTheDayRecipient.update({
                where: { id: r.id },
                data: { sentAt: new Date() },
              }).catch(() => {})
            }

            await new Promise((resolve) => setTimeout(resolve, 150))
          } catch (err) {
            console.error('Failed to send POTD email to ' + r.email + ':', err)
          }

          createNotification({
            userId: r.userId,
            title: '📰 Paper of the Day: "' + potd.title + '"',
            message: 'Featured research spotlight by ' + potd.authors + '. Check today breakthrough paper.',
            type: 'SYSTEM',
            link: potd.paperId ? ('/papers/' + potd.paperId) : (potd.url || '/papers'),
          }).catch(() => {})
        }

        await prisma.paperOfTheDay.update({
          where: { id: potd.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      }
    }

    // 2. Fetch the latest active Paper of the Day
    const latestPotd = await prisma.paperOfTheDay.findFirst({
      where: {
        status: 'SENT',
      },
      orderBy: { sentAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!latestPotd) {
      return NextResponse.json({ potd: null, message: 'No Paper of the Day broadcast yet' })
    }

    // Check if user already has this paper in their library
    let alreadyInLibrary = false
    if (latestPotd.doi) {
      const cleanDoi = latestPotd.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
      const existingPaper = await prisma.paper.findFirst({
        where: {
          userId: user.id,
          OR: [
            { doi: cleanDoi },
            { doi: latestPotd.doi },
            { title: latestPotd.title },
          ],
        },
      })
      alreadyInLibrary = Boolean(existingPaper)
    }

    return NextResponse.json({
      potd: {
        id: latestPotd.id,
        doi: latestPotd.doi,
        title: latestPotd.title,
        authors: latestPotd.authors,
        abstract: latestPotd.abstract,
        journal: latestPotd.journal,
        year: latestPotd.year,
        url: latestPotd.url,
        pdfUrl: latestPotd.pdfUrl,
        theme: latestPotd.theme,
        score: latestPotd.score || '9.4/10',
        topics: latestPotd.topics ? latestPotd.topics.split(',').map((t: string) => t.trim()) : [],
        sentAt: latestPotd.sentAt,
        alreadyInLibrary,
      },
    })
  } catch (error) {
    console.error('Error fetching active Paper of the Day:', error)
    return NextResponse.json({ error: 'Failed to fetch Paper of the Day' }, { status: 500 })
  }
}

// POST /api/paper-of-the-day — 1-Click 'Add to My Library' for Paper of the Day
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { potdId } = await request.json()
    if (!potdId) {
      return NextResponse.json({ error: 'Paper of the Day ID is required' }, { status: 400 })
    }

    const potd = await prisma.paperOfTheDay.findUnique({
      where: { id: potdId },
    })

    if (!potd) {
      return NextResponse.json({ error: 'Paper of the Day not found' }, { status: 404 })
    }

    const cleanDoi = potd.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()

    // Check if already in user's library
    const existing = await prisma.paper.findFirst({
      where: {
        userId: user.id,
        OR: [
          { doi: cleanDoi },
          { doi: potd.doi },
          { title: potd.title },
        ],
      },
    })

    if (existing) {
      return NextResponse.json({
        message: 'Paper is already in your research library!',
        paper: existing,
        alreadyExisted: true,
      })
    }

    // Extract tags from topics
    const topicTags = potd.topics ? potd.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : []

    // Add paper to user's personal library
    const newPaper = await prisma.paper.create({
      data: {
        userId: user.id,
        title: potd.title,
        authors: potd.authors,
        abstract: potd.abstract || '',
        journal: potd.journal || null,
        publicationYear: potd.year || null,
        doi: cleanDoi,
        url: potd.url || ('https://doi.org/' + cleanDoi),
        pdfPath: potd.pdfUrl || null,
        status: 'TO_READ',
        priority: 'HIGH',
        tags: {
          connectOrCreate: topicTags.map((t: string) => ({
            where: { userId_name: { userId: user.id, name: t.toLowerCase() } },
            create: { name: t.toLowerCase(), userId: user.id },
          })),
        },
      },
    })

    return NextResponse.json({
      message: '🎉 Added Paper of the Day to your library!',
      paper: newPaper,
      alreadyExisted: false,
    })
  } catch (error) {
    console.error('Error adding Paper of the Day to library:', error)
    return NextResponse.json({ error: 'Failed to add paper to library' }, { status: 500 })
  }
}
