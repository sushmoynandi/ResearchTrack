import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { papers, collectionId, defaultStatus = 'TO_READ', defaultPriority = 'MEDIUM' } = body

    if (!papers || !Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json({ error: 'No papers provided for batch import' }, { status: 400 })
    }

    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const p of papers) {
      if (!p.title || !p.title.trim()) {
        skippedCount++
        continue
      }

      const cleanTitle = p.title.trim()
      const cleanAuthors = p.authors ? p.authors.trim() : 'Academic Researcher'
      const cleanDoi = p.doi ? p.doi.trim() : null
      const cleanArxivId = p.arxivId ? p.arxivId.trim() : null

      try {
        // Check for duplicate by DOI or Title
        const existing = await prisma.paper.findFirst({
          where: {
            userId: user.id,
            OR: [
              ...(cleanDoi ? [{ doi: cleanDoi }] : []),
              { title: { equals: cleanTitle, mode: 'insensitive' } },
            ],
          },
        })

        if (existing) {
          skippedCount++
          continue
        }

        // Create paper
        await prisma.paper.create({
          data: {
            userId: user.id,
            title: cleanTitle,
            authors: cleanAuthors,
            abstract: p.abstract ? p.abstract.trim() : null,
            doi: cleanDoi,
            url: p.url ? p.url.trim() : null,
            journal: p.journal ? p.journal.trim() : (p.venue ? p.venue.trim() : null),
            publicationYear: p.publicationYear ? parseInt(p.publicationYear) : (p.year ? parseInt(p.year) : null),
            status: p.status || defaultStatus,
            priority: p.priority || defaultPriority,
            arxivId: cleanArxivId,
            citationCount: p.citationCount ? parseInt(p.citationCount) : 0,
            architecture: p.architecture || null,
            problemSolved: p.problemSolved || null,
            keyContribution: p.keyContribution || null,
            collections: collectionId ? { connect: [{ id: collectionId }] } : undefined,
          },
        })
        importedCount++
      } catch (err: any) {
        errors.push(`Failed to import "${cleanTitle.slice(0, 30)}": ${err.message}`)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalCount: papers.length,
      errors,
    })
  } catch (error) {
    console.error('Batch import error:', error)
    return NextResponse.json({ error: 'Failed to process batch import' }, { status: 500 })
  }
}
