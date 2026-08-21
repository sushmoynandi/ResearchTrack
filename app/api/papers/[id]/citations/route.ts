import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface S2Author {
  name: string
}

interface S2PaperRef {
  paperId?: string
  title?: string
  authors?: S2Author[]
  year?: number
  citationCount?: number
  url?: string
  venue?: string
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: {
        id: true,
        title: true,
        authors: true,
        doi: true,
        arxivId: true,
        publicationYear: true,
        citationCount: true,
        url: true,
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Check all existing paper titles in the library to tag which nodes are already in library
    const allLibraryPapers = await prisma.paper.findMany({
      select: { id: true, title: true, doi: true, arxivId: true },
    })
    const libraryTitleMap = new Map(
      allLibraryPapers.map((p) => [p.title.toLowerCase().trim(), p.id])
    )

    let s2Data: {
      paperId?: string
      title?: string
      year?: number
      citationCount?: number
      citations?: S2PaperRef[]
      references?: S2PaperRef[]
      venue?: string
    } | null = null

    // Determine query identifier
    const queryId = paper.doi
      ? `DOI:${paper.doi}`
      : paper.arxivId
      ? `ARXIV:${paper.arxivId.replace(/^arxiv:/i, '')}`
      : null

    const fields =
      'title,authors,year,citationCount,url,venue,citations.title,citations.authors,citations.year,citations.citationCount,citations.url,citations.paperId,references.title,references.authors,references.year,references.citationCount,references.url,references.paperId'

    if (queryId) {
      try {
        const res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(queryId)}?fields=${fields}`,
          { headers: { 'User-Agent': 'PaperTrack-Researcher/1.0' }, next: { revalidate: 3600 } }
        )
        if (res.ok) {
          s2Data = await res.json()
        }
      } catch (s2Err) {
        console.warn('Semantic Scholar ID lookup error:', s2Err)
      }
    }

    // Fallback: Search by title
    if (!s2Data || !s2Data.title) {
      try {
        const searchRes = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
            paper.title
          )}&limit=1&fields=${fields}`,
          { headers: { 'User-Agent': 'PaperTrack-Researcher/1.0' }, next: { revalidate: 3600 } }
        )
        if (searchRes.ok) {
          const searchJson = await searchRes.json()
          if (searchJson.data && searchJson.data.length > 0) {
            s2Data = searchJson.data[0]
          }
        }
      } catch (searchErr) {
        console.warn('Semantic Scholar Title search fallback error:', searchErr)
      }
    }

    const centerNodeId = paper.id
    const nodes: Array<{
      id: string
      title: string
      authors: string
      year: number | null
      citationCount: number
      type: 'center' | 'reference' | 'citation'
      venue: string
      url: string
      inLibrary: boolean
      libraryId?: string
    }> = [
      {
        id: centerNodeId,
        title: paper.title,
        authors: paper.authors,
        year: paper.publicationYear || (s2Data?.year ?? null),
        citationCount: paper.citationCount || (s2Data?.citationCount ?? 0),
        type: 'center',
        venue: s2Data?.venue || 'Target Paper',
        url: paper.url || '',
        inLibrary: true,
        libraryId: paper.id,
      },
    ]

    const links: Array<{
      source: string
      target: string
      type: 'cites' | 'referenced_by'
    }> = []

    if (s2Data) {
      // 1. Prior Work / Foundational References (Outgoing links from Center -> Ref)
      const topReferences = (s2Data.references || [])
        .filter((r) => r.title && r.title.length > 5)
        .slice(0, 15)

      topReferences.forEach((ref, idx) => {
        const refId = ref.paperId || `ref-${idx}-${Date.now()}`
        const cleanTitle = ref.title!.trim()
        const libMatchId = libraryTitleMap.get(cleanTitle.toLowerCase())

        nodes.push({
          id: refId,
          title: cleanTitle,
          authors: ref.authors?.map((a) => a.name).join(', ') || 'Unknown Authors',
          year: ref.year || null,
          citationCount: ref.citationCount || 0,
          type: 'reference',
          venue: ref.venue || 'Reference Work',
          url: ref.url || '',
          inLibrary: Boolean(libMatchId),
          libraryId: libMatchId,
        })

        links.push({
          source: centerNodeId,
          target: refId,
          type: 'cites',
        })
      })

      // 2. Derivative Citations / Derivative Works (Incoming links from Citation -> Center)
      const topCitations = (s2Data.citations || [])
        .filter((c) => c.title && c.title.length > 5)
        .slice(0, 15)

      topCitations.forEach((cit, idx) => {
        const citId = cit.paperId || `cit-${idx}-${Date.now()}`
        const cleanTitle = cit.title!.trim()
        const libMatchId = libraryTitleMap.get(cleanTitle.toLowerCase())

        nodes.push({
          id: citId,
          title: cleanTitle,
          authors: cit.authors?.map((a) => a.name).join(', ') || 'Unknown Authors',
          year: cit.year || null,
          citationCount: cit.citationCount || 0,
          type: 'citation',
          venue: cit.venue || 'Citing Work',
          url: cit.url || '',
          inLibrary: Boolean(libMatchId),
          libraryId: libMatchId,
        })

        links.push({
          source: citId,
          target: centerNodeId,
          type: 'referenced_by',
        })
      })
    }

    return NextResponse.json({
      centerPaper: {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.publicationYear,
        citationCount: paper.citationCount || s2Data?.citationCount || 0,
      },
      nodes,
      links,
      stats: {
        totalReferences: s2Data?.references?.length || 0,
        totalCitations: s2Data?.citations?.length || s2Data?.citationCount || 0,
        connectedNodesCount: nodes.length,
      },
    })
  } catch (error) {
    console.error('Error computing citation network:', error)
    return NextResponse.json(
      { error: 'Failed to generate citation graph' },
      { status: 500 }
    )
  }
}
