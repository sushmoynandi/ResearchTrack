import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, institution, department, systemRole } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const validRoles = ['STUDENT', 'SUPERVISOR']
    const assignedRole = validRoles.includes(systemRole) ? systemRole : 'STUDENT'

    const cleanEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        institution: institution?.trim() || null,
        department: department?.trim() || null,
        systemRole: assignedRole as any,
        role: assignedRole,
        provider: 'CREDENTIALS',
      },
    })

    // Pre-seed a welcome paper for the new researcher
    try {
      await prisma.paper.create({
        data: {
          userId: user.id,
          title: 'Attention Is All You Need',
          authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, et al.',
          abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
          doi: '10.48550/arXiv.1706.03762',
          url: 'https://arxiv.org/abs/1706.03762',
          journal: 'NeurIPS 2017',
          publicationYear: 2017,
          status: 'COMPLETED',
          priority: 'CRITICAL',
          isFavorite: true,
          architecture: 'Dense Transformer',
          parameters: '65M (Base)',
          contextWindow: '512 tokens',
          replicationStatus: 'REPLICATED',
          benchmarks: JSON.stringify([
            { name: 'WMT 2014 En-De', score: '28.4 BLEU', metric: 'BLEU', baseline: '26.3' }
          ]),
          problemSolved: 'Overcoming the sequential bottleneck of RNNs with parallelizable self-attention.',
          keyContribution: 'Multi-Head Self-Attention architecture without recurrence.',
          tags: {
            create: [
              { name: 'transformer', userId: user.id },
              { name: 'foundational', userId: user.id }
            ]
          }
        }
      })
    } catch {
      // non-blocking
    }

    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      institution: user.institution,
      department: user.department,
      image: user.image,
      isGuest: false,
      provider: 'CREDENTIALS',
    })

    const isProd = process.env.NODE_ENV === 'production'
    const cookieConfig = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    }

    try {
      const cookieStore = await cookies()
      cookieStore.set('researchtrack_session', sessionToken, cookieConfig)
      cookieStore.set('papertrack_session', sessionToken, cookieConfig)
    } catch {
      // fallback
    }

    const response = NextResponse.json(
      {
        success: true,
        token: sessionToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          systemRole: user.systemRole,
          institution: user.institution,
          department: user.department,
          image: user.image,
        },
      },
      { status: 201 }
    )

    response.cookies.set('researchtrack_session', sessionToken, cookieConfig)
    response.cookies.set('papertrack_session', sessionToken, cookieConfig)
    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
