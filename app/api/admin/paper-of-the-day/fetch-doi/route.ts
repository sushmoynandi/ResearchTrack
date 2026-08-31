import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const { doi } = await request.json()
    if (!doi || typeof doi !== 'string') {
      return NextResponse.json({ error: 'Valid DOI link or string is required' }, { status: 400 })
    }

    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim()

    let metadata: any = {
      doi: cleanDoi,
      title: '',
      authors: '',
      abstract: '',
      journal: '',
      year: null,
      url: 'https://doi.org/' + cleanDoi,
      pdfUrl: null,
    }

    // 1. Try CrossRef API
    try {
      const crossrefRes = await fetch('https://api.crossref.org/works/' + encodeURIComponent(cleanDoi), {
        headers: { 'User-Agent': 'ResearchTrack/1.0 (mailto:admin@researchtrack.app)' },
      })
      if (crossrefRes.ok) {
        const json = await crossrefRes.json()
        const item = json.message
        if (item) {
          metadata.title = item.title?.[0] || ''
          metadata.authors = (item.author || [])
            .map((a: any) => ((a.given || '') + ' ' + (a.family || '')).trim())
            .filter(Boolean)
            .join(', ')
          metadata.journal = item['container-title']?.[0] || item.publisher || ''
          metadata.year = item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || null
          metadata.abstract = item.abstract ? item.abstract.replace(/<[^>]+>/g, '').trim() : ''
          if (item.link && Array.isArray(item.link)) {
            const pdfLink = item.link.find((l: any) => l['content-type'] === 'application/pdf')
            if (pdfLink) metadata.pdfUrl = pdfLink.URL
          }
        }
      }
    } catch (e) {
      console.warn('CrossRef lookup notice:', e)
    }

    // 2. Try Semantic Scholar fallback
    if (!metadata.title || !metadata.abstract) {
      try {
        const s2Res = await fetch(
          'https://api.semanticscholar.org/graph/v1/paper/DOI:' + encodeURIComponent(cleanDoi) + '?fields=title,authors,abstract,year,venue,openAccessPdf'
        )
        if (s2Res.ok) {
          const s2 = await s2Res.json()
          if (!metadata.title && s2.title) metadata.title = s2.title
          if (!metadata.authors && s2.authors) {
            metadata.authors = s2.authors.map((a: any) => a.name).join(', ')
          }
          if (!metadata.abstract && s2.abstract) metadata.abstract = s2.abstract
          if (!metadata.journal && s2.venue) metadata.journal = s2.venue
          if (!metadata.year && s2.year) metadata.year = s2.year
          if (!metadata.pdfUrl && s2.openAccessPdf?.url) metadata.pdfUrl = s2.openAccessPdf.url
        }
      } catch (e) {
        console.warn('Semantic Scholar lookup notice:', e)
      }
    }

    // 3. Try OpenAlex fallback
    if (!metadata.title || !metadata.abstract) {
      try {
        const oaRes = await fetch('https://api.openalex.org/works/https://doi.org/' + encodeURIComponent(cleanDoi))
        if (oaRes.ok) {
          const oa = await oaRes.json()
          if (!metadata.title && oa.title) metadata.title = oa.title
          if (!metadata.authors && oa.authorships) {
            metadata.authors = oa.authorships.map((a: any) => a.author?.display_name).filter(Boolean).join(', ')
          }
          if (!metadata.journal && oa.primary_location?.source?.display_name) {
            metadata.journal = oa.primary_location.source.display_name
          }
          if (!metadata.year && oa.publication_year) metadata.year = oa.publication_year
          if (!metadata.pdfUrl && oa.open_access?.oa_url) metadata.pdfUrl = oa.open_access.oa_url
          if (!metadata.abstract && oa.abstract_inverted_index) {
            const words: string[] = []
            for (const [word, positions] of Object.entries(oa.abstract_inverted_index as Record<string, number[]>)) {
              for (const pos of positions) {
                words[pos] = word
              }
            }
            metadata.abstract = words.join(' ').trim()
          }
        }
      } catch (e) {
        console.warn('OpenAlex lookup notice:', e)
      }
    }

    if (!metadata.title) {
      return NextResponse.json(
        {
          error: 'Could not automatically resolve metadata for this DOI. You may still manually enter details.',
          metadata,
        },
        { status: 422 }
      )
    }

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Error fetching DOI metadata:', error)
    return NextResponse.json({ error: 'Failed to process DOI' }, { status: 500 })
  }
}
