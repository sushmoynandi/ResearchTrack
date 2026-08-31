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
      return NextResponse.json({ error: 'Valid DOI or paper link is required' }, { status: 400 })
    }

    // Handle DOI, arXiv URL, or arXiv ID
    let rawInput = doi.trim()
    let cleanDoi = rawInput.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
    let arxivId = ''

    // Check if input is arXiv URL (e.g. https://arxiv.org/abs/2408.01234 or 2408.01234)
    const arxivMatch = rawInput.match(/(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:\s*)([0-9]+\.[0-9]+(?:v[0-9]+)?)/i)
    if (arxivMatch) {
      arxivId = arxivMatch[1].replace(/v[0-9]+$/, '')
    } else if (/^[0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?$/.test(rawInput)) {
      arxivId = rawInput.replace(/v[0-9]+$/, '')
    }

    let metadata: any = {
      doi: cleanDoi,
      title: '',
      authors: '',
      abstract: '',
      journal: '',
      year: null,
      url: cleanDoi.startsWith('http') ? cleanDoi : `https://doi.org/${cleanDoi}`,
      pdfUrl: null,
      topics: [] as string[],
    }

    // 1. If arXiv ID detected, resolve directly via arXiv / Semantic Scholar
    if (arxivId) {
      metadata.doi = `10.48550/arXiv.${arxivId}`
      metadata.url = `https://arxiv.org/abs/${arxivId}`
      metadata.pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
      metadata.journal = 'arXiv'

      try {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}?fields=title,authors,abstract,year,venue,openAccessPdf,fieldsOfStudy`,
          { headers: { 'User-Agent': 'ResearchTrack/1.0' } }
        )
        if (s2Res.ok) {
          const s2 = await s2Res.json()
          if (s2.title) metadata.title = s2.title
          if (s2.authors) metadata.authors = s2.authors.map((a: any) => a.name).join(', ')
          if (s2.abstract) metadata.abstract = s2.abstract
          if (s2.venue) metadata.journal = s2.venue
          if (s2.year) metadata.year = s2.year
          if (s2.fieldsOfStudy) metadata.topics = s2.fieldsOfStudy
        }
      } catch (e) {
        console.warn('arXiv Semantic Scholar error:', e)
      }
    }

    // 2. Try CrossRef API (Standard for all published DOIs)
    if (!metadata.title) {
      try {
        const crossrefRes = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
          headers: { 'User-Agent': 'ResearchTrack/1.0 (mailto:admin@researchtrack.app)' },
        })
        if (crossrefRes.ok) {
          const json = await crossrefRes.json()
          const item = json.message
          if (item) {
            metadata.title = Array.isArray(item.title) ? item.title[0] : item.title || ''
            metadata.authors = (item.author || [])
              .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
              .filter(Boolean)
              .join(', ')
            metadata.journal = Array.isArray(item['container-title'])
              ? item['container-title'][0]
              : item['container-title'] || item.publisher || ''
            metadata.year =
              item.published?.['date-parts']?.[0]?.[0] ||
              item['published-print']?.['date-parts']?.[0]?.[0] ||
              item['published-online']?.['date-parts']?.[0]?.[0] ||
              item.created?.['date-parts']?.[0]?.[0] ||
              null

            if (item.abstract) {
              metadata.abstract = item.abstract.replace(/<[^>]+>/g, '').trim()
            }

            if (item.link && Array.isArray(item.link)) {
              const pdfLink = item.link.find((l: any) => l['content-type'] === 'application/pdf')
              if (pdfLink) metadata.pdfUrl = pdfLink.URL
            }
          }
        }
      } catch (e) {
        console.warn('CrossRef lookup error:', e)
      }
    }

    // 3. Try Semantic Scholar DOI Lookup
    if (!metadata.title || !metadata.abstract) {
      try {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=title,authors,abstract,year,venue,openAccessPdf,fieldsOfStudy`,
          { headers: { 'User-Agent': 'ResearchTrack/1.0' } }
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
          if (s2.fieldsOfStudy && metadata.topics.length === 0) metadata.topics = s2.fieldsOfStudy
        }
      } catch (e) {
        console.warn('Semantic Scholar lookup error:', e)
      }
    }

    // 4. Try OpenAlex Lookup
    if (!metadata.title || !metadata.abstract) {
      try {
        const oaRes = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}`, {
          headers: { 'User-Agent': 'ResearchTrack/1.0' },
        })
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
          if (oa.concepts && metadata.topics.length === 0) {
            metadata.topics = oa.concepts.slice(0, 4).map((c: any) => c.display_name)
          }

          // Inverted index abstract reconstruction
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
        console.warn('OpenAlex lookup error:', e)
      }
    }

    // 5. Fallback: Direct DOI Content Negotiation Header (citeproc json)
    if (!metadata.title) {
      try {
        const directDoiRes = await fetch(`https://doi.org/${encodeURIComponent(cleanDoi)}`, {
          headers: { Accept: 'application/vnd.citationstyles.csl+json' },
          redirect: 'follow',
        })
        if (directDoiRes.ok) {
          const csl = await directDoiRes.json()
          if (csl.title) metadata.title = csl.title
          if (csl.author && Array.isArray(csl.author)) {
            metadata.authors = csl.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean).join(', ')
          }
          if (csl['container-title']) metadata.journal = csl['container-title']
          if (csl.issued?.['date-parts']?.[0]?.[0]) metadata.year = csl.issued['date-parts'][0][0]
        }
      } catch (e) {
        console.warn('Direct DOI citeproc lookup error:', e)
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
