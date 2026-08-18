import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

// GET /api/tags — List all tags scoped to user with paper counts
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json([])
    }

    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { papers: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json([])
  }
}

// POST /api/tags — Create a new tag scoped to user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name: name.trim().toLowerCase(),
      },
      include: { _count: { select: { papers: true } } },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Tag already exists in your taxonomy' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
