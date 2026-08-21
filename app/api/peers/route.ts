import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

// GET /api/peers — Return active students for peer sharing and collaboration
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const where: any = {
      systemRole: 'STUDENT',
      id: { not: user.id },
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }

    const peers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        department: true,
        institution: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(peers)
  } catch (error) {
    console.error('Error fetching peers:', error)
    return NextResponse.json({ error: 'Failed to fetch peers' }, { status: 500 })
  }
}
