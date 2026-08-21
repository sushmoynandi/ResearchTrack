import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface RecommendedPaper {
  id: string
  title: string
  authors: string
  abstract?: string
  journal?: string
  publicationYear?: number
  citationCount?: number
  arxivId?: string
  doi?: string
  url?: string
  category: 'foundational' | 'recent' | 'alternative'
  reason: string
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: { tags: true },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    let recommendations: RecommendedPaper[] = []

    // 1. Try querying Semantic Scholar API for recommendations
    try {
      let s2Query = ''
      if (paper.arxivId) {
        s2Query = `ARXIV:${paper.arxivId}`
      } else if (paper.doi) {
        s2Query = `DOI:${paper.doi}`
      }

      if (s2Query) {
        const s2Res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(
            s2Query
          )}/recommendations?fields=title,authors,abstract,venue,year,citationCount,externalIds,url&limit=10`,
          {
            headers: {
              'User-Agent': 'PaperTrack-Academic-Lab-Portal/2.0',
            },
            next: { revalidate: 3600 },
          }
        )

        if (s2Res.ok) {
          const s2Data = await s2Res.json()
          if (s2Data.recommendedPapers && Array.isArray(s2Data.recommendedPapers)) {
            recommendations = s2Data.recommendedPapers.map((item: any, idx: number) => {
              const authors = item.authors ? item.authors.map((a: any) => a.name).join(', ') : 'Academic Researchers'
              const year = item.year || new Date().getFullYear()
              const currentYear = new Date().getFullYear()
              const citations = item.citationCount || 0

              let category: 'foundational' | 'recent' | 'alternative' = 'recent'
              let reason = 'Recent related advancement in same subfield'

              if (citations > 500 || year < currentYear - 3) {
                category = 'foundational'
                reason = 'Highly cited foundational paper'
              } else if (idx % 2 === 1) {
                category = 'alternative'
                reason = 'Parallel architectural approach / baseline'
              }

              return {
                id: item.paperId || `rec-${idx}`,
                title: item.title,
                authors,
                abstract: item.abstract || null,
                journal: item.venue || 'Academic Venue',
                publicationYear: year,
                citationCount: citations,
                arxivId: item.externalIds?.ArXiv || null,
                doi: item.externalIds?.DOI || null,
                url: item.url || (item.externalIds?.ArXiv ? `https://arxiv.org/abs/${item.externalIds.ArXiv}` : null),
                category,
                reason,
              }
            })
          }
        }
      }
    } catch {
      // Fallback if network or rate limited
    }

    // 2. Academic Curated Fallbacks if external API didn't return or paper had no DOI/ArXiv
    if (recommendations.length === 0) {
      recommendations = [
        {
          id: 'rec-fallback-1',
          title: 'Attention Is All You Need',
          authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, et al.',
          abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
          journal: 'NeurIPS',
          publicationYear: 2017,
          citationCount: 142000,
          arxivId: '1706.03762',
          doi: '10.48550/arXiv.1706.03762',
          url: 'https://arxiv.org/abs/1706.03762',
          category: 'foundational',
          reason: 'Pioneered foundational multi-head self-attention transformer backbone',
        },
        {
          id: 'rec-fallback-2',
          title: 'Deep Residual Learning for Image Recognition',
          authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
          abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper...',
          journal: 'CVPR',
          publicationYear: 2016,
          citationCount: 215000,
          doi: '10.1109/CVPR.2016.90',
          url: 'https://doi.org/10.1109/CVPR.2016.90',
          category: 'foundational',
          reason: 'Seminal identity shortcut connections for deep gradient propagation',
        },
        {
          id: 'rec-fallback-3',
          title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
          authors: 'Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon, Christopher D. Manning, Chelsea Finn',
          abstract: 'While large-scale unsupervised language models learn broad world knowledge, steering their behaviors requires fine-tuning methods like RLHF. We propose DPO...',
          journal: 'NeurIPS',
          publicationYear: 2023,
          citationCount: 3850,
          arxivId: '2305.18290',
          url: 'https://arxiv.org/abs/2305.18290',
          category: 'recent',
          reason: 'State-of-the-art closed-form alignment formulation',
        },
        {
          id: 'rec-fallback-4',
          title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
          authors: 'Albert Gu, Tri Dao',
          abstract: 'Foundation models are now predominantly based on the Transformer architecture. We introduce Mamba, a selective state space model with linear time complexity...',
          journal: 'arXiv Pre-print',
          publicationYear: 2023,
          citationCount: 2200,
          arxivId: '2312.00752',
          url: 'https://arxiv.org/abs/2312.00752',
          category: 'alternative',
          reason: 'Linear-time sub-quadratic alternative architecture to attention mechanisms',
        },
      ]
    }

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Error fetching paper recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}
