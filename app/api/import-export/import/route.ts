import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { Status, Priority } from '@prisma/client'

interface ImportPaperItem {
  title: string
  authors: string
  abstract?: string
  doi?: string
  url?: string
  journal?: string
  publicationYear?: number | string
  status?: string
  priority?: string
  isFavorite?: boolean
  tags?: string[] | string
  collections?: string[] | string
  architecture?: string
  parameters?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { papers } = body as { papers: ImportPaperItem[] }

    if (!Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload. An array of papers is required.' },
        { status: 400 }
      )
    }

    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const item of papers) {
      if (!item.title || !item.authors) {
        skippedCount++
        errors.push(`Skipped item missing title or authors: "${item.title || 'Untitled'}"`)
        continue
      }

      // Format tags
      let tagList: string[] = []
      if (Array.isArray(item.tags)) {
        tagList = item.tags.map((t) => (typeof t === 'string' ? t : (t as { name: string }).name))
      } else if (typeof item.tags === 'string' && item.tags.trim()) {
        tagList = item.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      }

      // Format status
      const validStatuses = ['TO_READ', 'READING', 'COMPLETED', 'ARCHIVED']
      const status: Status = validStatuses.includes(item.status?.toUpperCase() || '')
        ? (item.status?.toUpperCase() as Status)
        : 'TO_READ'

      // Format priority
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      const priority: Priority = validPriorities.includes(item.priority?.toUpperCase() || '')
        ? (item.priority?.toUpperCase() as Priority)
        : 'MEDIUM'

      const pubYear = item.publicationYear ? parseInt(String(item.publicationYear), 10) : null

      try {
        await prisma.paper.create({
          data: {
            userId: user.id,
            title: item.title.trim(),
            authors: item.authors.trim(),
            abstract: item.abstract?.trim() || null,
            doi: item.doi?.trim() || null,
            url: item.url?.trim() || null,
            journal: item.journal?.trim() || null,
            publicationYear: isNaN(pubYear as number) ? null : pubYear,
            status,
            priority,
            isFavorite: Boolean(item.isFavorite),
            architecture: item.architecture || null,
            parameters: item.parameters || null,
            tags: tagList.length
              ? {
                  connectOrCreate: tagList.map((tag) => ({
                    where: {
                      userId_name: {
                        userId: user.id,
                        name: tag.toLowerCase(),
                      },
                    },
                    create: {
                      name: tag.toLowerCase(),
                      userId: user.id,
                    },
                  })),
                }
              : undefined,
          },
        })
        importedCount++
      } catch (err: unknown) {
        skippedCount++
        const msg = err instanceof Error ? err.message : 'Database error'
        errors.push(`Failed to import "${item.title}": ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error('Error in import route:', error)
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    )
  }
}
