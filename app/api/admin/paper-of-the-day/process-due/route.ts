import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendPaperOfTheDayEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const now = new Date()

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
      take: 10,
    })

    if (dueBroadcasts.length === 0) {
      return NextResponse.json({ message: 'No pending scheduled broadcasts due', processedCount: 0 })
    }

    let processedTotal = 0

    for (const potd of dueBroadcasts) {
      const parsedTopics = potd.topics ? potd.topics.split(',').map((t) => t.trim()) : null
      let sentSuccessCount = 0

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
            sentSuccessCount++
            await prisma.paperOfTheDayRecipient.update({
              where: { id: r.id },
              data: { sentAt: new Date() },
            }).catch(() => {})
          }

          // Small delay (150ms) between dispatches to guarantee smooth SMTP delivery
          await new Promise((resolve) => setTimeout(resolve, 150))
        } catch (err) {
          console.error(`Failed to send scheduled POTD email to ${r.email}:`, err)
        }

        // In-app notification
        createNotification({
          userId: r.userId,
          title: `📰 Paper of the Day: "${potd.title}"`,
          message: `Featured research spotlight by ${potd.authors}. Check today's breakthrough paper.`,
          type: 'SYSTEM',
          link: potd.paperId ? `/papers/${potd.paperId}` : (potd.url || '/papers'),
        }).catch(() => {})
      }

      await prisma.paperOfTheDay.update({
        where: { id: potd.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })

      console.log(`[POTD DUE PROCESS] Processed broadcast ${potd.id} (${sentSuccessCount}/${potd.recipients.length} emails dispatched).`)
      processedTotal++
    }

    return NextResponse.json({
      message: `Successfully processed and dispatched ${processedTotal} scheduled broadcast(s)`,
      processedCount: processedTotal,
    })
  } catch (error) {
    console.error('Error processing due Paper of the Day broadcasts:', error)
    return NextResponse.json({ error: 'Failed to process due broadcasts' }, { status: 500 })
  }
}
