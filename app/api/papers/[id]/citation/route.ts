import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCitation, CitationFormat } from '@/lib/citations'
import type { Paper } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format')?.toUpperCase() || 'APA') as CitationFormat

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const citation = generateCitation(paper as unknown as Paper, format)
    return NextResponse.json({ format, citation })
  } catch (error) {
    console.error('Error generating citation:', error)
    return NextResponse.json(
      { error: 'Failed to generate citation' },
      { status: 500 }
    )
  }
}
