import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import type { LiteratureReviewData, BenchmarkScore } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const body = await request.json()
    const { message, history } = body as {
      message: string
      history?: ChatMessage[]
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        tags: true,
        collections: true,
        notes: {
          where: {
            OR: [
              ...(user?.id ? [{ userId: user.id }] : []),
              { isPrivate: false },
            ],
          },
          select: { content: true, createdAt: true },
        },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Load literatureReview from database
    let litReview: LiteratureReviewData = {}
    try {
      const rows = await prisma.$queryRawUnsafe<{ literatureReview: string | null }[]>(
        'SELECT "literatureReview" FROM "Paper" WHERE "id" = $1',
        id
      )
      if (rows && rows.length > 0 && rows[0].literatureReview) {
        litReview = JSON.parse(rows[0].literatureReview)
      }
    } catch (rawErr) {
      console.warn('Chat raw literatureReview lookup:', rawErr)
    }

    let benchmarksList: BenchmarkScore[] = []
    if (paper.benchmarks) {
      try {
        benchmarksList = typeof paper.benchmarks === 'string' ? JSON.parse(paper.benchmarks) : paper.benchmarks
      } catch {
        // ignore
      }
    }

    const q = message.toLowerCase()

    // Context-grounded synthesis engine
    let responseText = ''

    if (q.includes('method') || q.includes('pipeline') || q.includes('architecture') || q.includes('model')) {
      responseText = `### 🧠 Methodology & Pipeline Breakdown for "${paper.title}"\n\n`
      if (paper.architecture) {
        responseText += `* **Architecture Family:** ${paper.architecture}\n`
      }
      if (paper.parameters) {
        responseText += `* **Model Scale / Parameters:** ${paper.parameters}\n`
      }
      if (paper.contextWindow) {
        responseText += `* **Context Length:** ${paper.contextWindow}\n`
      }
      if (litReview.q4MethodsPipeline?.detailedAnswer) {
        responseText += `\n**Core Algorithmic Mechanism (Q4):**\n${litReview.q4MethodsPipeline.detailedAnswer}\n`
      } else if (paper.keyContribution) {
        responseText += `\n**Key Novel Mechanism:**\n${paper.keyContribution}\n`
      }
      if (litReview.q3FeaturesInputs?.detailedAnswer) {
        responseText += `\n**Input Representations & Features (Q3):**\n${litReview.q3FeaturesInputs.detailedAnswer}\n`
      }
      if (litReview.q1ProblemImportance?.detailedAnswer) {
        responseText += `\n**Target Problem (Q1):**\n${litReview.q1ProblemImportance.detailedAnswer}\n`
      }
    } else if (q.includes('benchmark') || q.includes('result') || q.includes('metric') || q.includes('score') || q.includes('number')) {
      responseText = `### 📊 Empirical Results & Benchmarks for "${paper.title}"\n\n`
      if (benchmarksList.length > 0) {
        responseText += `| Benchmark | Score | Metric | Baseline |\n| :--- | :--- | :--- | :--- |\n`
        benchmarksList.forEach((b) => {
          responseText += `| **${b.name}** | \`${b.score}\` | ${b.metric || '—'} | ${b.baseline || '—'} |\n`
        })
        responseText += '\n'
      }
      if (litReview.q7KeyResults?.detailedAnswer) {
        responseText += `**Quantitative Findings (Q7):**\n${litReview.q7KeyResults.detailedAnswer}\n\n`
      }
      if (litReview.q6Evaluation?.detailedAnswer) {
        responseText += `**Evaluation Protocol (Q6):**\n${litReview.q6Evaluation.detailedAnswer}\n\n`
      }
      if (litReview.q5Baselines?.detailedAnswer) {
        responseText += `**Compared Baselines (Q5):**\n${litReview.q5Baselines.detailedAnswer}\n`
      }
    } else if (q.includes('limitation') || q.includes('weakness') || q.includes('gap') || q.includes('bias') || q.includes('cost')) {
      responseText = `### ⚠️ Limitations, Biases & Research Gaps for "${paper.title}"\n\n`
      if (litReview.researchGap) {
        responseText += `* **Identified Research Gap:**\n${litReview.researchGap}\n\n`
      }
      if (litReview.q8LimitationsBiases?.detailedAnswer) {
        responseText += `* **Limitations & Failure Modes (Q8):**\n${litReview.q8LimitationsBiases.detailedAnswer}\n\n`
      }
      if (paper.limitations) {
        responseText += `* **Digest Notes:**\n${paper.limitations}\n\n`
      }
      if (paper.computeBudget) {
        responseText += `* **Compute Constraints:** ${paper.computeBudget}\n`
      }
    } else if (q.includes('bibtex') || q.includes('latex') || q.includes('cite') || q.includes('citation')) {
      const citeKey = paper.authors.split(',')[0].trim().split(' ').pop()?.toLowerCase() || 'paper'
      const year = paper.publicationYear || new Date().getFullYear()
      const titleClean = paper.title.replace(/[{}]/g, '')
      const bibtex = `@article{${citeKey}${year}${titleClean.slice(0, 10).replace(/[^a-zA-Z]/g, '')},\n  title={${titleClean}},\n  author={${paper.authors}},\n  journal={${paper.journal || 'arXiv pre-print'}},\n  year={${year}}${paper.doi ? `,\n  doi={${paper.doi}}` : ''}${paper.arxivId ? `,\n  eprint={${paper.arxivId}}` : ''}\n}`
      responseText = `### 📝 BibTeX & Citation Entry\n\n\`\`\`bibtex\n${bibtex}\n\`\`\`\n\n**APA Format:**\n${paper.authors} (${year}). ${paper.title}. *${paper.journal || 'arXiv'}*.`
    } else if (q.includes('replicate') || q.includes('code') || q.includes('weights') || q.includes('dataset') || q.includes('github')) {
      responseText = `### 🧪 Replication, Code & Artifacts Hub\n\n`
      responseText += `* **Replication Status:** \`${paper.replicationStatus}\`\n`
      if (paper.codeUrl) responseText += `* **Code Repository:** [${paper.codeUrl}](${paper.codeUrl})\n`
      if (paper.modelUrl) responseText += `* **Model Weights:** [${paper.modelUrl}](${paper.modelUrl})\n`
      if (paper.datasetUrl) responseText += `* **Dataset:** [${paper.datasetUrl}](${paper.datasetUrl})\n`
      if (litReview.summaryRepository) responseText += `* **Summary Repo:** [${litReview.summaryRepository}](${litReview.summaryRepository})\n`
      if (litReview.q9ArtifactsReplication?.detailedAnswer) {
        responseText += `\n**Artifact Details (Q9):**\n${litReview.q9ArtifactsReplication.detailedAnswer}\n`
      }
    } else {
      // General Synthesis & Q&A
      responseText = `### 📄 Research Synthesis: "${paper.title}"\n\n`
      responseText += `**Authors:** ${paper.authors} (${paper.publicationYear || 'N/A'})\n\n`
      if (paper.abstract) {
        responseText += `**Abstract Summary:**\n${paper.abstract}\n\n`
      }
      if (litReview.outcome || paper.keyContribution) {
        responseText += `**Final OutCome / Key Impact:**\n${litReview.outcome || paper.keyContribution}\n\n`
      }
      if (litReview.remarks) {
        responseText += `**Reviewer Remarks:**\n${litReview.remarks}\n`
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: responseText,
      grounding: {
        paperTitle: paper.title,
        hasAbstract: Boolean(paper.abstract),
        hasLiteratureReview: Object.keys(litReview).length > 0,
        benchmarksCount: benchmarksList.length,
      },
    })
  } catch (error) {
    console.error('Paper Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
