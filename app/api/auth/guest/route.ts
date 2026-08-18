import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

const GUEST_SAMPLE_PAPERS = [
  {
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, et al.',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
    doi: '10.48550/arXiv.1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
    journal: 'NeurIPS 2017',
    publicationYear: 2017,
    status: 'COMPLETED' as const,
    priority: 'CRITICAL' as const,
    isFavorite: true,
    arxivId: '1706.03762',
    codeUrl: 'https://github.com/tensorflow/tensor2tensor',
    architecture: 'Dense Transformer',
    parameters: '65M (Base) / 213M (Big)',
    contextWindow: '512 tokens',
    computeBudget: '8x P100 GPUs (3.5 days)',
    replicationStatus: 'REPLICATED' as const,
    benchmarks: JSON.stringify([
      { name: 'WMT 2014 En-De', score: '28.4 BLEU', metric: 'BLEU', baseline: '26.3' },
      { name: 'WMT 2014 En-Fr', score: '41.8 BLEU', metric: 'BLEU', baseline: '40.6' },
    ]),
    problemSolved: 'Sequential computation in RNNs/LSTMs bottlenecks training throughput on long sequences.',
    keyContribution: 'Multi-Head Self-Attention mechanism eliminating recurrence entirely.',
    limitations: 'Quadratic O(N^2) complexity with sequence length.',
    tags: ['transformer', 'nlp', 'deep-learning', 'foundational'],
  },
  {
    title: 'Llama 3: The Llama 3 Herd of Models',
    authors: 'Aaron Grattafiori, Abhimanyu Dubey, Abhinav Jauhri, Abhinav Pandey, et al.',
    abstract: 'Modern artificial intelligence is powered by large language models. In this paper, we present Llama 3, a herd of language models with up to 405B parameters and context length up to 128k tokens, trained on over 15 trillion tokens.',
    doi: '10.48550/arXiv.2407.21783',
    url: 'https://arxiv.org/abs/2407.21783',
    journal: 'Meta AI Research 2024',
    publicationYear: 2024,
    status: 'READING' as const,
    priority: 'CRITICAL' as const,
    isFavorite: true,
    arxivId: '2407.21783',
    codeUrl: 'https://github.com/meta-llama/llama3',
    modelUrl: 'https://huggingface.co/meta-llama/Meta-Llama-3-70B',
    architecture: 'Dense Transformer',
    parameters: '8B, 70B, 405B',
    contextWindow: '128k tokens',
    computeBudget: '16,000x H100 GPUs (15T tokens)',
    replicationStatus: 'REPRODUCING' as const,
    benchmarks: JSON.stringify([
      { name: 'MMLU', score: '88.6%', metric: '5-shot', baseline: '86.4% (GPT-4)' },
      { name: 'GSM8K', score: '96.8%', metric: '8-shot CoT', baseline: '92.0%' },
      { name: 'HumanEval', score: '89.0%', metric: '0-shot pass@1', baseline: '84.1%' },
    ]),
    problemSolved: 'Reaching frontier closed-source capabilities in open-weights models.',
    keyContribution: 'Massive scale 15T token pretraining pipeline and Grouped Query Attention.',
    limitations: 'High inference memory requirements for the 405B dense model.',
    tags: ['llama-3', 'llm', 'open-weights', 'reasoning'],
  },
  {
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    authors: 'Albert Gu, Tri Dao',
    abstract: 'Foundation models face computational inefficiency on long sequences due to quadratic attention scaling. We introduce Mamba, a selective state space model achieving linear-time inference and training.',
    doi: '10.48550/arXiv.2312.00752',
    url: 'https://arxiv.org/abs/2312.00752',
    journal: 'ICML 2024',
    publicationYear: 2023,
    status: 'TO_READ' as const,
    priority: 'HIGH' as const,
    isFavorite: false,
    arxivId: '2312.00752',
    codeUrl: 'https://github.com/state-spaces/mamba',
    modelUrl: 'https://huggingface.co/state-spaces/mamba-2.8b',
    architecture: 'State Space Model (SSM / Mamba)',
    parameters: '130M to 2.8B',
    contextWindow: '1M+ tokens',
    computeBudget: 'Hardware-aware scan kernels on A100',
    replicationStatus: 'UNTESTED' as const,
    benchmarks: JSON.stringify([
      { name: 'LAMBADA', score: '76.8%', metric: '0-shot', baseline: '73.2%' },
      { name: 'Throughput', score: '5x speedup', metric: 'tokens/sec', baseline: '1x' },
    ]),
    problemSolved: 'Eliminating quadratic attention cost while retaining content-dependent reasoning.',
    keyContribution: 'Selective scan algorithm parameterizing SSM matrices by input tokens.',
    limitations: 'Fixed state capacity on complex multi-hop associative recall.',
    tags: ['mamba', 'ssm', 'linear-attention', 'state-space'],
  },
]

export async function POST() {
  try {
    const guestId = crypto.randomUUID().slice(0, 8)
    const guestEmail = `guest-${guestId}@papertrack.demo`
    const guestName = `Guest Researcher #${guestId.slice(0, 4)}`

    const user = await prisma.user.create({
      data: {
        name: guestName,
        email: guestEmail,
        institution: 'PaperTrack Sandbox Lab',
        role: 'STUDENT',
        provider: 'GUEST',
        isGuest: true,
      },
    })

    for (const p of GUEST_SAMPLE_PAPERS) {
      await prisma.paper.create({
        data: {
          userId: user.id,
          title: p.title,
          authors: p.authors,
          abstract: p.abstract,
          doi: p.doi,
          url: p.url,
          journal: p.journal,
          publicationYear: p.publicationYear,
          status: p.status,
          priority: p.priority,
          isFavorite: p.isFavorite,
          arxivId: p.arxivId,
          codeUrl: p.codeUrl,
          modelUrl: p.modelUrl || null,
          architecture: p.architecture,
          parameters: p.parameters,
          contextWindow: p.contextWindow,
          computeBudget: p.computeBudget,
          replicationStatus: p.replicationStatus,
          benchmarks: p.benchmarks,
          problemSolved: p.problemSolved,
          keyContribution: p.keyContribution,
          limitations: p.limitations,
          tags: {
            create: p.tags.map((tag) => ({
              name: tag,
              userId: user.id,
            })),
          },
        },
      })
    }

    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      institution: user.institution,
      department: user.department,
      image: user.image,
      isGuest: true,
      provider: 'GUEST',
    })

    const cookieOptions = getSessionCookieOptions(7)

    try {
      const cookieStore = await cookies()
      cookieStore.set({ ...cookieOptions, value: sessionToken })
    } catch {
      // fallback
    }

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        institution: user.institution,
        isGuest: true,
      },
    })

    response.cookies.set({ ...cookieOptions, value: sessionToken })
    return response
  } catch (error: any) {
    console.error('Guest login error:', error)
    return NextResponse.json({ error: 'Failed to create guest session', details: error?.message || String(error) }, { status: 500 })
  }
}
