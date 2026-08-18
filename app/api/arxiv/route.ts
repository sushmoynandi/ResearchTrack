import { NextRequest, NextResponse } from 'next/server'

interface ExtractedInput {
  type: 'arxiv' | 'doi' | 's2' | 'corpusid' | 'query'
  value: string
}

// Clean HTML / XML / LaTeX tags and entities
function cleanText(text: string): string {
  if (!text) return ''
  return text
    .replace(/<jats:[^>]+>/gi, '')
    .replace(/<\/jats:[^>]+>/gi, '')
    .replace(/<[^>]+>/g, '') // remove HTML tags
    .replace(/\\(?:textbf|textit|emph|mathrm|mathbf|mathit|text)\{([^}]+)\}/g, '$1')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[\$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper to extract identifier type and value from diverse inputs
function parseInput(input: string): ExtractedInput {
  const clean = input.trim()

  // 1. Semantic Scholar URL with 40-char SHA ID:
  // e.g. https://www.semanticscholar.org/paper/Attention-Is-All-You-Need-Vaswani-Shazeer/204e3073870fae3d05bcbc2f6a8e263c9b72e77b
  const s2UrlMatch = clean.match(/semanticscholar\.org\/paper\/(?:[^/]+\/)?([a-f0-9]{40})/i)
  if (s2UrlMatch) {
    return { type: 's2', value: s2UrlMatch[1] }
  }

  // 2. Semantic Scholar Corpus ID:
  // e.g. https://www.semanticscholar.org/paper/CorpusID:13756489 or CorpusID:13756489
  const corpusMatch = clean.match(/(?:corpusid:\s*|corpusid=)([0-9]+)/i)
  if (corpusMatch) {
    return { type: 'corpusid', value: corpusMatch[1] }
  }

  // 3. ArXiv DOI: e.g. 10.48550/arXiv.1706.03762 or https://doi.org/10.48550/arXiv.1706.03762
  const arxivDoiMatch = clean.match(/(?:(?:https?:\/\/)?(?:dx\.)?doi\.org\/|doi:\s*)?10\.48550\/arxiv\.([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i)
  if (arxivDoiMatch) {
    return { type: 'arxiv', value: arxivDoiMatch[1] }
  }

  // 4. ArXiv URLs: e.g. https://arxiv.org/abs/1706.03762, https://arxiv.org/pdf/1706.03762.pdf, https://ar5iv.labs.arxiv.org/html/1706.03762
  const arxivUrlMatch = clean.match(/(?:arxiv\.org\/(?:abs|pdf|html)|ar5iv\.labs\.arxiv\.org\/html)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i)
  if (arxivUrlMatch) {
    return { type: 'arxiv', value: arxivUrlMatch[1] }
  }

  // 5. ArXiv prefix: e.g. arXiv:1706.03762
  const arxivPrefixMatch = clean.match(/^arxiv:\s*([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i)
  if (arxivPrefixMatch) {
    return { type: 'arxiv', value: arxivPrefixMatch[1] }
  }

  // 6. Direct ArXiv ID: e.g. 1706.03762 or 1706.03762v1
  const directArxivMatch = clean.match(/^([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)$/i)
  if (directArxivMatch) {
    return { type: 'arxiv', value: directArxivMatch[1] }
  }

  // 7. Old style ArXiv format: e.g. hep-th/9901001 or https://arxiv.org/abs/hep-th/9901001
  const oldArxivMatch = clean.match(/([a-z\-]+(?:\.[A-Z]{2})?\/[0-9]{7})/i)
  if (oldArxivMatch) {
    return { type: 'arxiv', value: oldArxivMatch[1] }
  }

  // 8. General DOI links and raw DOIs:
  // e.g. https://doi.org/10.1038/s41586-020-2649-2, http://dx.doi.org/10.1145/3581783.3612474, doi:10.1109/CVPR.2016.90, 10.1038/nature14539
  const generalDoiMatch = clean.match(/(?:(?:https?:\/\/)?(?:dx\.)?doi\.org\/|doi:\s*)?(10\.[0-9]{4,9}\/[-._;()/:A-Za-z0-9]+)/i)
  if (generalDoiMatch) {
    let doi = generalDoiMatch[1].trim()
    // Clean trailing punctuation that might have been copied from text (e.g. "10.1038/xyz.")
    doi = doi.replace(/[.,;)]+$/, '')
    return { type: 'doi', value: doi }
  }

  // 9. Semantic Scholar 40-char SHA Hash directly:
  if (/^[a-f0-9]{40}$/i.test(clean)) {
    return { type: 's2', value: clean }
  }

  // 10. Fallback to free-text title / query search
  return { type: 'query', value: clean }
}

// Helper to guess architecture family from title and abstract
function inferArchitecture(title: string, abstract: string): string {
  const combined = `${title} ${abstract}`.toLowerCase()
  if (combined.includes('mixture of experts') || combined.includes('mixture-of-experts') || /\bmoe\b/.test(combined)) {
    return 'Mixture of Experts (MoE)'
  }
  if (combined.includes('state space model') || combined.includes('selective state space') || /\bmamba\b/.test(combined) || /\bssm\b/.test(combined)) {
    return 'State Space Model (SSM / Mamba)'
  }
  if (combined.includes('diffusion') || combined.includes('flow matching') || combined.includes('score-based') || /\bddpm\b/.test(combined)) {
    return 'Diffusion / Flow Matching'
  }
  if (combined.includes('transformer') || combined.includes('self-attention') || combined.includes('multi-head attention')) {
    return 'Dense Transformer'
  }
  if (combined.includes('convolutional') || combined.includes('convnet') || /\bcnn\b/.test(combined) || /\bresnet\b/.test(combined)) {
    return 'Convolutional (CNN)'
  }
  if (combined.includes('reinforcement learning') || combined.includes('rlhf') || combined.includes('direct preference optimization') || /\bdpo\b/.test(combined) || /\bppo\b/.test(combined)) {
    return 'Reinforcement Learning (RL / RLHF)'
  }
  if (combined.includes('graph neural network') || /\bgnn\b/.test(combined)) {
    return 'Graph Neural Network (GNN)'
  }
  return ''
}

// Helper to extract GitHub / Hugging Face links from text
function extractExternalLinks(text: string): { githubUrl: string; modelUrl: string } {
  let githubUrl = ''
  let modelUrl = ''

  const ghMatch = text.match(/https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?=[^A-Za-z0-9_.-]|$)/i)
  if (ghMatch) {
    githubUrl = `https://github.com/${ghMatch[1]}`
  }

  const hfMatch = text.match(/https?:\/\/huggingface\.co\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?=[^A-Za-z0-9_.-]|$)/i)
  if (hfMatch) {
    modelUrl = `https://huggingface.co/${hfMatch[1]}`
  }

  return { githubUrl, modelUrl }
}

// Generate friendly tags from academic subjects & keywords
function generateTags(
  title: string,
  abstract: string,
  categories: string[],
  s2Fields: string[] = []
): string[] {
  const tags: Set<string> = new Set()

  const categoryTagMap: Record<string, string> = {
    'cs.AI': 'artificial-intelligence',
    'cs.CL': 'nlp',
    'cs.CV': 'computer-vision',
    'cs.LG': 'machine-learning',
    'cs.RO': 'robotics',
    'cs.NE': 'neural-computing',
    'cs.IR': 'information-retrieval',
    'stat.ML': 'machine-learning',
    'q-bio.NC': 'computational-biology',
  }

  categories.forEach((cat) => {
    if (categoryTagMap[cat]) {
      tags.add(categoryTagMap[cat])
    } else {
      tags.add(cat.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
  })

  s2Fields.forEach((field) => {
    const slug = field.toLowerCase().replace(/\s+/g, '-')
    if (slug) tags.add(slug)
  })

  const text = `${title} ${abstract}`.toLowerCase()
  if (text.includes('large language model') || text.includes('llm') || text.includes('foundation model')) tags.add('llm')
  if (text.includes('transformer') || text.includes('attention')) tags.add('transformer')
  if (text.includes('reinforcement learning') || text.includes('rlhf') || text.includes('dpo')) tags.add('reinforcement-learning')
  if (text.includes('diffusion') || text.includes('generative')) tags.add('diffusion')
  if (text.includes('vision-language') || text.includes('multimodal')) tags.add('multimodal')
  if (text.includes('reasoning') || text.includes('chain-of-thought')) tags.add('reasoning')
  if (text.includes('fine-tuning') || text.includes('lora') || text.includes('peft')) tags.add('fine-tuning')
  if (text.includes('benchmark') || text.includes('evaluation')) tags.add('benchmark')
  if (text.includes('state space') || text.includes('mamba')) tags.add('state-space')
  if (text.includes('open weights') || text.includes('open-source')) tags.add('open-weights')

  if (tags.size === 0) {
    tags.add('machine-learning')
  }

  return Array.from(tags).slice(0, 7)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParam =
      searchParams.get('id') ||
      searchParams.get('url') ||
      searchParams.get('query') ||
      searchParams.get('doi') ||
      ''

    if (!queryParam.trim()) {
      return NextResponse.json(
        {
          error:
            'Please provide a paper identifier: ArXiv ID (1706.03762), ArXiv URL, DOI link (https://doi.org/10.1038/...), Semantic Scholar link, or paper title.',
        },
        { status: 400 }
      )
    }

    const parsed = parseInput(queryParam)

    let title = ''
    let authors: string[] = []
    let abstract = ''
    let publishedYear: number | null = null
    let journal = ''
    let doi = ''
    let arxivId = ''
    let pdfUrl = ''
    let paperUrl = ''
    let citationCount = 0
    let influentialCitationCount = 0
    let s2Url = ''
    let githubUrl = ''
    let modelUrl = ''
    let keyContribution = ''
    let problemSolved = ''
    const categories: string[] = []
    const s2Fields: string[] = []

    // ----------------------------------------------------
    // Scenario A: ArXiv ID Identified
    // ----------------------------------------------------
    if (parsed.type === 'arxiv') {
      arxivId = parsed.value.replace(/v[0-9]+$/, '')
      doi = `10.48550/arXiv.${arxivId}`
      pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
      paperUrl = `https://arxiv.org/abs/${arxivId}`

      // 1. Query official ArXiv API (Atom XML)
      try {
        const arxivApiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`
        const res = await fetch(arxivApiUrl, {
          headers: { 'User-Agent': 'PaperTrack/1.0 (Research Assistant)' },
          next: { revalidate: 3600 },
        })
        if (res.ok) {
          const xmlText = await res.text()
          if (xmlText.includes('<entry>')) {
            const titleMatch = xmlText.match(/<entry>[\s\S]*?<title>([\s\S]*?)<\/title>/i)
            if (titleMatch) {
              title = cleanText(titleMatch[1])
            }

            const summaryMatch = xmlText.match(/<summary>([\s\S]*?)<\/summary>/i)
            if (summaryMatch) {
              abstract = cleanText(summaryMatch[1])
            }

            const authorMatches = xmlText.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)
            for (const m of authorMatches) {
              authors.push(cleanText(m[1]))
            }

            const publishedMatch = xmlText.match(/<published>([0-9]{4})-[0-9]{2}-[0-9]{2}/i)
            if (publishedMatch) {
              publishedYear = parseInt(publishedMatch[1], 10)
            }

            const categoryMatches = xmlText.matchAll(/<category\s+term="([^"]+)"/gi)
            for (const c of categoryMatches) {
              if (!categories.includes(c[1])) {
                categories.push(c[1])
              }
            }

            const journalMatch = xmlText.match(/<arxiv:journal_ref[^>]*>([\s\S]*?)<\/arxiv:journal_ref>/i)
            if (journalMatch) {
              journal = cleanText(journalMatch[1])
            }

            const doiMatch = xmlText.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i)
            if (doiMatch) {
              doi = cleanText(doiMatch[1])
            }
          }
        }
      } catch (err) {
        console.warn('ArXiv API fetch encountered an issue:', err)
      }

      // 2. Query Semantic Scholar for enriched metrics, citations & TLDR
      try {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${arxivId}?fields=title,authors,abstract,year,venue,publicationVenue,citationCount,influentialCitationCount,openAccessPdf,externalIds,url,isOpenAccess,tldr,s2FieldsOfStudy`,
          {
            headers: { 'User-Agent': 'PaperTrack/1.0' },
            next: { revalidate: 3600 },
          }
        )

        if (s2Res.ok) {
          const s2Data = await s2Res.json()
          if (!title && s2Data.title) title = cleanText(s2Data.title)
          if (authors.length === 0 && s2Data.authors) {
            authors = s2Data.authors.map((a: { name: string }) => cleanText(a.name))
          }
          if (!abstract && s2Data.abstract) abstract = cleanText(s2Data.abstract)
          if (!publishedYear && s2Data.year) publishedYear = s2Data.year
          if (!journal && s2Data.venue) journal = s2Data.venue
          if (s2Data.externalIds?.DOI) doi = s2Data.externalIds.DOI
          if (s2Data.citationCount) citationCount = s2Data.citationCount
          if (s2Data.influentialCitationCount) influentialCitationCount = s2Data.influentialCitationCount
          if (s2Data.url) s2Url = s2Data.url
          if (s2Data.tldr?.text) {
            keyContribution = s2Data.tldr.text
          }
          if (s2Data.s2FieldsOfStudy && Array.isArray(s2Data.s2FieldsOfStudy)) {
            s2Data.s2FieldsOfStudy.forEach((f: { category: string }) => {
              if (f.category) s2Fields.push(f.category)
            })
          }
        }
      } catch {
        // Semantic Scholar lookup is supplementary
      }
    }

    // ----------------------------------------------------
    // Scenario B: Standard / Universal DOI Link or DOI
    // ----------------------------------------------------
    else if (parsed.type === 'doi') {
      doi = parsed.value
      paperUrl = `https://doi.org/${doi}`

      // 1. Try Semantic Scholar DOI endpoint
      try {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,abstract,year,venue,publicationVenue,citationCount,influentialCitationCount,openAccessPdf,externalIds,url,isOpenAccess,tldr,s2FieldsOfStudy`,
          {
            headers: { 'User-Agent': 'PaperTrack/1.0' },
            next: { revalidate: 3600 },
          }
        )

        if (s2Res.ok) {
          const s2Data = await s2Res.json()
          if (s2Data.title) title = cleanText(s2Data.title)
          if (s2Data.authors && Array.isArray(s2Data.authors)) {
            authors = s2Data.authors.map((a: { name: string }) => cleanText(a.name))
          }
          if (s2Data.abstract) abstract = cleanText(s2Data.abstract)
          if (s2Data.year) publishedYear = s2Data.year
          if (s2Data.venue) journal = s2Data.venue
          if (s2Data.citationCount) citationCount = s2Data.citationCount
          if (s2Data.influentialCitationCount) influentialCitationCount = s2Data.influentialCitationCount
          if (s2Data.url) s2Url = s2Data.url
          if (s2Data.openAccessPdf?.url) pdfUrl = s2Data.openAccessPdf.url
          if (s2Data.externalIds?.ArXiv) {
            arxivId = s2Data.externalIds.ArXiv
            if (!pdfUrl) pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
          }
          if (s2Data.tldr?.text) {
            keyContribution = s2Data.tldr.text
          }
          if (s2Data.s2FieldsOfStudy && Array.isArray(s2Data.s2FieldsOfStudy)) {
            s2Data.s2FieldsOfStudy.forEach((f: { category: string }) => {
              if (f.category) s2Fields.push(f.category)
            })
          }
        }
      } catch {
        // Continue to Crossref fallback
      }

      // 2. Query Crossref API (Universal registry for all DOIs)
      if (!title || authors.length === 0 || !abstract) {
        try {
          const crossrefRes = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
            {
              headers: {
                'User-Agent': 'PaperTrack/1.0 (mailto:support@papertrack.local)',
              },
              next: { revalidate: 3600 },
            }
          )

          if (crossrefRes.ok) {
            const crJson = await crossrefRes.json()
            const cr = crJson.message

            if (!title && cr.title && cr.title[0]) {
              title = cleanText(cr.title[0])
            }

            if (authors.length === 0 && cr.author && Array.isArray(cr.author)) {
              authors = cr.author.map((a: { given?: string; family?: string; name?: string }) => {
                if (a.given && a.family) return `${cleanText(a.given)} ${cleanText(a.family)}`
                return cleanText(a.name || a.family || a.given || 'Unknown')
              })
            }

            if (!abstract && cr.abstract) {
              abstract = cleanText(cr.abstract)
            }

            if (!publishedYear) {
              const yearObj =
                cr['published-print'] || cr['published-online'] || cr.created
              if (yearObj?.['date-parts']?.[0]?.[0]) {
                publishedYear = yearObj['date-parts'][0][0]
              }
            }

            if (!journal && cr['container-title'] && cr['container-title'][0]) {
              journal = cleanText(cr['container-title'][0])
            }

            if (!citationCount && cr['is-referenced-by-count']) {
              citationCount = cr['is-referenced-by-count']
            }

            if (!pdfUrl && cr.link && Array.isArray(cr.link)) {
              const pdfLink = cr.link.find(
                (l: { 'content-type'?: string; URL?: string }) =>
                  l['content-type']?.includes('pdf') || l.URL?.endsWith('.pdf')
              )
              if (pdfLink?.URL) pdfUrl = pdfLink.URL
            }

            if (cr.subject && Array.isArray(cr.subject)) {
              cr.subject.forEach((s: string) => s2Fields.push(s))
            }
          }
        } catch (err) {
          console.warn('Crossref lookup error:', err)
        }
      }
    }

    // ----------------------------------------------------
    // Scenario C: Semantic Scholar SHA or CorpusID
    // ----------------------------------------------------
    else if (parsed.type === 's2' || parsed.type === 'corpusid') {
      const s2Identifier =
        parsed.type === 'corpusid' ? `CorpusID:${parsed.value}` : parsed.value

      try {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/${s2Identifier}?fields=title,authors,abstract,year,venue,publicationVenue,citationCount,influentialCitationCount,openAccessPdf,externalIds,url,isOpenAccess,tldr,s2FieldsOfStudy`,
          {
            headers: { 'User-Agent': 'PaperTrack/1.0' },
            next: { revalidate: 3600 },
          }
        )

        if (s2Res.ok) {
          const s2Data = await s2Res.json()
          title = cleanText(s2Data.title || '')
          if (s2Data.authors) {
            authors = s2Data.authors.map((a: { name: string }) => cleanText(a.name))
          }
          abstract = cleanText(s2Data.abstract || '')
          publishedYear = s2Data.year || null
          journal = s2Data.venue || ''
          doi = s2Data.externalIds?.DOI || ''
          citationCount = s2Data.citationCount || 0
          influentialCitationCount = s2Data.influentialCitationCount || 0
          s2Url = s2Data.url || ''
          paperUrl = s2Url || (doi ? `https://doi.org/${doi}` : '')

          if (s2Data.openAccessPdf?.url) pdfUrl = s2Data.openAccessPdf.url
          if (s2Data.externalIds?.ArXiv) {
            arxivId = s2Data.externalIds.ArXiv
            if (!pdfUrl) pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
          }
          if (s2Data.tldr?.text) {
            keyContribution = s2Data.tldr.text
          }
          if (s2Data.s2FieldsOfStudy) {
            s2Data.s2FieldsOfStudy.forEach((f: { category: string }) => {
              if (f.category) s2Fields.push(f.category)
            })
          }
        }
      } catch (err) {
        console.warn('Semantic Scholar ID lookup error:', err)
      }
    }

    // ----------------------------------------------------
    // Scenario D: Search Query / Paper Title Fallback
    // ----------------------------------------------------
    else if (parsed.type === 'query') {
      try {
        const s2SearchRes = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(parsed.value)}&limit=1&fields=title,authors,abstract,year,venue,publicationVenue,citationCount,influentialCitationCount,openAccessPdf,externalIds,url,isOpenAccess,tldr,s2FieldsOfStudy`,
          {
            headers: { 'User-Agent': 'PaperTrack/1.0' },
            next: { revalidate: 3600 },
          }
        )

        if (s2SearchRes.ok) {
          const s2SearchData = await s2SearchRes.json()
          if (s2SearchData.data && s2SearchData.data.length > 0) {
            const item = s2SearchData.data[0]
            title = cleanText(item.title || '')
            if (item.authors) {
              authors = item.authors.map((a: { name: string }) => cleanText(a.name))
            }
            abstract = cleanText(item.abstract || '')
            publishedYear = item.year || null
            journal = item.venue || ''
            doi = item.externalIds?.DOI || ''
            citationCount = item.citationCount || 0
            influentialCitationCount = item.influentialCitationCount || 0
            s2Url = item.url || ''
            paperUrl = s2Url || (doi ? `https://doi.org/${doi}` : '')

            if (item.openAccessPdf?.url) pdfUrl = item.openAccessPdf.url
            if (item.externalIds?.ArXiv) {
              arxivId = item.externalIds.ArXiv
              if (!pdfUrl) pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
            }
            if (item.tldr?.text) {
              keyContribution = item.tldr.text
            }
            if (item.s2FieldsOfStudy) {
              item.s2FieldsOfStudy.forEach((f: { category: string }) => {
                if (f.category) s2Fields.push(f.category)
              })
            }
          }
        }
      } catch (err) {
        console.warn('Semantic Scholar Title Search lookup error:', err)
      }
    }

    // Final Validation
    if (!title) {
      return NextResponse.json(
        {
          error: `Could not retrieve paper metadata for "${queryParam}". Please verify the ArXiv ID, DOI link, Semantic Scholar URL, or paper title.`,
        },
        { status: 404 }
      )
    }

    // Extract GitHub / Hugging Face links from abstract / title
    const extractedLinks = extractExternalLinks(`${title} ${abstract}`)
    if (extractedLinks.githubUrl) githubUrl = extractedLinks.githubUrl
    if (extractedLinks.modelUrl) modelUrl = extractedLinks.modelUrl

    // Infer AI Architecture Family
    const architecture = inferArchitecture(title, abstract)

    // Generate intelligent AI / ML tags
    const generatedTags = generateTags(title, abstract, categories, s2Fields)

    // Synthesize problem solved if not present
    if (!problemSolved && abstract) {
      // Pick first 1-2 sentences of abstract as contextual problem definition
      const sentences = abstract.split(/(?<=[.!?])\s+/)
      if (sentences.length > 0) {
        problemSolved = sentences[0]
      }
    }

    return NextResponse.json({
      title,
      authors: authors.join(', '),
      abstract,
      publicationYear: publishedYear,
      journal: journal || (arxivId ? 'arXiv preprint' : 'Academic Publication'),
      doi: doi || (arxivId ? `10.48550/arXiv.${arxivId}` : ''),
      url: paperUrl || (arxivId ? `https://arxiv.org/abs/${arxivId}` : (doi ? `https://doi.org/${doi}` : '')),
      pdfUrl,
      arxivId,
      citationCount,
      influentialCitationCount,
      semanticScholarUrl: s2Url,
      githubUrl,
      modelUrl,
      architecture,
      keyContribution,
      problemSolved,
      tags: generatedTags,
    })
  } catch (error) {
    console.error('Error fetching paper metadata:', error)
    return NextResponse.json(
      { error: 'Failed to extract paper metadata. Please check your network connection or input.' },
      { status: 500 }
    )
  }
}
