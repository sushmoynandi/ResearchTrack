import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const papers = await prisma.paper.findMany({
      where: { userId: user.id },
      include: {
        tags: { select: { name: true } },
        collections: { select: { name: true } },
        notes: { select: { content: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (format === 'csv') {
      const headers = [
        'Title',
        'Authors',
        'Status',
        'Priority',
        'Publication Year',
        'Journal',
        'DOI',
        'URL',
        'Is Favorite',
        'Architecture',
        'Parameters',
        'Tags',
        'Collections',
        'Abstract',
      ]

      const escapeCsv = (str: string | number | boolean | null | undefined) => {
        if (str === null || str === undefined) return '""'
        const clean = String(str).replace(/"/g, '""')
        return `"${clean}"`
      }

      const rows = papers.map((p) => [
        escapeCsv(p.title),
        escapeCsv(p.authors),
        escapeCsv(p.status),
        escapeCsv(p.priority),
        escapeCsv(p.publicationYear),
        escapeCsv(p.journal),
        escapeCsv(p.doi),
        escapeCsv(p.url),
        escapeCsv(p.isFavorite),
        escapeCsv(p.architecture),
        escapeCsv(p.parameters),
        escapeCsv(p.tags.map((t) => t.name).join(', ')),
        escapeCsv(p.collections.map((c) => c.name).join(', ')),
        escapeCsv(p.abstract),
      ])

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="researchtrack-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const jsonOutput = JSON.stringify(papers, null, 2)
    return new NextResponse(jsonOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="researchtrack-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting papers:', error)
    return NextResponse.json(
      { error: 'Failed to export library' },
      { status: 500 }
    )
  }
}
