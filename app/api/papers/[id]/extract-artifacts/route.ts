import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to extract clean GitHub, HuggingFace, and Colab links from text
function extractArtifactUrls(text: string) {
  const githubMatches = text.match(/https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/gi) || []
  const huggingfaceMatches = text.match(/https?:\/\/huggingface\.co\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?/gi) || []
  const colabMatches = text.match(/https?:\/\/colab\.research\.google\.com\/[^\s"')]+/gi) || []
  const kaggleMatches = text.match(/https?:\/\/kaggle\.com\/[^\s"')]+/gi) || []
  const zenodoMatches = text.match(/https?:\/\/zenodo\.org\/[^\s"')]+/gi) || []

  // Clean URLs
  const cleanGithub = githubMatches.map((u) => u.replace(/[.,;:)\]]+$/, '')).filter((u) => !u.endsWith('/issues') && !u.endsWith('/pulls'))
  const cleanHf = huggingfaceMatches.map((u) => u.replace(/[.,;:)\]]+$/, ''))
  const cleanColab = colabMatches.map((u) => u.replace(/[.,;:)\]]+$/, ''))

  const hfModels = cleanHf.filter((u) => !u.includes('/datasets/'))
  const hfDatasets = cleanHf.filter((u) => u.includes('/datasets/'))

  return {
    codeUrl: cleanGithub[0] || null,
    modelUrl: hfModels[0] || null,
    datasetUrl: hfDatasets[0] || kaggleMatches[0] || zenodoMatches[0] || null,
    notebookUrl: cleanColab[0] || null,
    allGithub: Array.from(new Set(cleanGithub)),
    allHuggingFace: Array.from(new Set(cleanHf)),
  }
}

// POST /api/papers/[id]/extract-artifacts — Auto-scan abstract & fulltext for GitHub/HF/Dataset links
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paperId } = await params

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id: paperId }, { slug: paperId }],
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Combine all textual sources for analysis
    const combinedCorpus = [
      paper.abstract || '',
      paper.url || '',
      paper.problemSolved || '',
      paper.keyContribution || '',
      paper.limitations || '',
      paper.literatureReview || '',
    ].join('\n')

    let extracted = extractArtifactUrls(combinedCorpus)

    // If no GitHub found and arxivId exists, query PapersWithCode or arXiv summary
    if (!extracted.codeUrl && paper.arxivId) {
      try {
        const rawId = paper.arxivId.replace(/^arxiv:\s*/i, '').replace(/v[0-9]+$/, '').trim()
        const pwcRes = await fetch(`https://paperswithcode.com/api/v1/papers/?arxiv_id=${rawId}`, {
          headers: { Accept: 'application/json' },
        })
        if (pwcRes.ok) {
          const pwcData = await pwcRes.json()
          if (pwcData?.results?.[0]?.url_abs) {
            // Check repositories endpoint
            const repoRes = await fetch(`https://paperswithcode.com/api/v1/papers/${pwcData.results[0].id}/repositories/`, {
              headers: { Accept: 'application/json' },
            })
            if (repoRes.ok) {
              const repoData = await repoRes.json()
              if (repoData?.results?.[0]?.url) {
                extracted.codeUrl = repoData.results[0].url
                extracted.allGithub.push(repoData.results[0].url)
              }
            }
          }
        }
      } catch {
        // non-blocking
      }
    }

    // Auto-update paper if new links found and paper fields are currently empty
    const updateData: Record<string, any> = {}
    if (!paper.codeUrl && extracted.codeUrl) updateData.codeUrl = extracted.codeUrl
    if (!paper.modelUrl && extracted.modelUrl) updateData.modelUrl = extracted.modelUrl
    if (!paper.datasetUrl && extracted.datasetUrl) updateData.datasetUrl = extracted.datasetUrl
    if (!paper.notebookUrl && extracted.notebookUrl) updateData.notebookUrl = extracted.notebookUrl

    if (Object.keys(updateData).length > 0) {
      await prisma.paper.update({
        where: { id: paper.id },
        data: updateData,
      })
    }

    return NextResponse.json({
      success: true,
      extracted,
      applied: updateData,
    })
  } catch (error: any) {
    console.error('Error auto-extracting artifacts:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to extract artifacts' },
      { status: 500 }
    )
  }
}
