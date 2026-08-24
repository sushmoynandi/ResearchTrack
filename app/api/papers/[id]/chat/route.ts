import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { callAiModel, AiProvider, AiChatMessage } from '@/lib/ai'
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      message,
      history = [],
      highlightedText,
      activeSection,
      provider = 'google',
      apiKey,
      consensusApiKey,
      model,
    } = body as {
      message: string
      history?: ChatMessage[]
      highlightedText?: string
      activeSection?: string
      provider?: AiProvider
      apiKey?: string
      consensusApiKey?: string
      model?: string
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
        user: { select: { id: true, supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
        shares: { select: { sharedWithId: true } },
        notes: {
          where: {
            OR: [
              { userId: user.id },
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

    // Access check: Owner, Admin, Supervisor in sphere, Assigned Student, or Shared Peer
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this paper workspace' },
        { status: 403 }
      )
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

    // ─── Build Grounded Academic Context ───
    let paperContext = `RESEARCH PAPER CONTEXT:
Title: ${paper.title}
Authors: ${paper.authors}
Year: ${paper.publicationYear || 'N/A'}
Venue: ${paper.journal || 'Academic Conference / Journal'}
DOI: ${paper.doi || 'N/A'}
ArXiv ID: ${paper.arxivId || 'N/A'}

ABSTRACT:
${paper.abstract || 'No abstract available.'}
`

    if (paper.architecture) {
      paperContext += `\nArchitecture: ${paper.architecture}`
    }
    if (paper.parameters) {
      paperContext += `\nModel Parameters: ${paper.parameters}`
    }
    if (paper.keyContribution) {
      paperContext += `\nKey Contribution: ${paper.keyContribution}`
    }
    if (paper.limitations) {
      paperContext += `\nKnown Limitations: ${paper.limitations}`
    }

    if (benchmarksList.length > 0) {
      paperContext += `\n\nBENCHMARK RESULTS:`
      benchmarksList.forEach((b) => {
        paperContext += `\n- ${b.name}: ${b.score} (Metric: ${b.metric || 'N/A'}, Baseline: ${b.baseline || 'N/A'})`
      })
    }

    if (litReview && Object.keys(litReview).length > 0) {
      paperContext += `\n\nSTRUCTURED LAB SYNTHESIS (Q1-Q9 SURVEY):`
      if (litReview.q1ProblemImportance?.detailedAnswer) paperContext += `\n- Problem Statement: ${litReview.q1ProblemImportance.detailedAnswer}`
      if (litReview.q4MethodsPipeline?.detailedAnswer) paperContext += `\n- Methodology: ${litReview.q4MethodsPipeline.detailedAnswer}`
      if (litReview.q7KeyResults?.detailedAnswer) paperContext += `\n- Key Results: ${litReview.q7KeyResults.detailedAnswer}`
      if (litReview.q8LimitationsBiases?.detailedAnswer) paperContext += `\n- Limitations: ${litReview.q8LimitationsBiases.detailedAnswer}`
    }

    if (activeSection) {
      paperContext += `\n\nCURRENTLY READING SECTION: ${activeSection}`
    }

    if (highlightedText && highlightedText.trim()) {
      paperContext += `\n\nUSER HIGHLIGHTED PASSAGE FROM PAPER (FOCUS HERE IF RELEVANT):
"""
${highlightedText.trim()}
"""`
    }

    const systemPrompt = `You are a Senior Academic Research Assistant & AI Peer-Reviewer for the lab portal PaperTrack.
Your role is to help the researcher understand, critique, and synthesize the research paper: "${paper.title}".

GUIDELINES:
1. Ground your answers directly in the provided paper context and state-of-the-art scientific literature.
2. If the user highlighted a passage or asks about an equation/method, provide an intuitive mathematical and conceptual breakdown with LaTeX formatting ($E = mc^2$ or $$...$$).
3. Be precise, concise, and academically rigorous. Highlight both technical strengths and potential methodological assumptions or limitations.
4. Use clean Markdown with headings, bullet points, and code/math blocks where helpful.
5. If the paper does not explicitly state something, clearly distinguish between what the authors claim versus standard domain knowledge.

${paperContext}`

    const formattedMessages: AiChatMessage[] = [
      ...history.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    try {
      const aiResponse = await callAiModel({
        provider,
        apiKey,
        consensusApiKey,
        paperTitle: paper.title,
        paperContext,
        model,
        systemPrompt,
        messages: formattedMessages,
        temperature: 0.3,
        maxTokens: 2048,
      })

      return NextResponse.json({
        role: 'assistant',
        content: aiResponse,
        provider,
        model: model || provider,
        grounding: {
          paperTitle: paper.title,
          hasHighlightedContext: Boolean(highlightedText),
          hasLiteratureReview: Object.keys(litReview).length > 0,
        },
      })
    } catch (aiErr: any) {
      console.warn('AI Model Call Failed, attempting fallback:', aiErr.message)

      // Fallback synthesis if no API key is available or external API failed
      const q = message.toLowerCase()
      let fallbackText = ''

      if (q.includes('method') || q.includes('pipeline') || q.includes('architecture')) {
        fallbackText = `### 🧠 Methodology & Pipeline for "${paper.title}"\n\n`
        if (paper.architecture) fallbackText += `* **Architecture:** ${paper.architecture}\n`
        if (litReview.q4MethodsPipeline?.detailedAnswer) {
          fallbackText += `* **Core Algorithmic Formulation:**\n${litReview.q4MethodsPipeline.detailedAnswer}\n`
        } else if (paper.keyContribution) {
          fallbackText += `* **Key Novel Mechanism:** ${paper.keyContribution}\n`
        }
        fallbackText += `\n*💡 Tip: To ask custom free-form questions, configure your Google Gemini / OpenAI key in AI Settings (top right).*`
      } else if (q.includes('limitation') || q.includes('gap') || q.includes('weakness')) {
        fallbackText = `### ⚠️ Identified Limitations & Research Gaps\n\n`
        if (litReview.q8LimitationsBiases?.detailedAnswer) {
          fallbackText += `${litReview.q8LimitationsBiases.detailedAnswer}\n\n`
        }
        if (paper.limitations) fallbackText += `* **Digest Notes:** ${paper.limitations}\n\n`
        fallbackText += `*💡 Tip: Configure your free Google Gemini API key to get deep algorithmic critique.*`
      } else {
        fallbackText = `### 📄 Research Breakdown for "${paper.title}"\n\n`
        fallbackText += `**Authors:** ${paper.authors} (${paper.publicationYear || 'N/A'})\n\n`
        if (paper.abstract) fallbackText += `**Abstract:**\n${paper.abstract}\n\n`
        if (highlightedText) fallbackText += `**Highlighted Excerpt:**\n> "${highlightedText}"\n\n`
        fallbackText += `> ⚠️ **Notice**: To chat live with GPT-4o, Claude 3.5, or free Gemini 2.0 on this paper, click the ⚙️ **AI Settings** button at the top of this panel and add your API key.`
      }

      return NextResponse.json({
        role: 'assistant',
        content: fallbackText,
        errorNotice: aiErr.message,
        isFallback: true,
      })
    }
  } catch (error: any) {
    console.error('Paper Chat error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}
