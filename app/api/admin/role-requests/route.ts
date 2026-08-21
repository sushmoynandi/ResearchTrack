import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/role-requests
 * Everything waiting for a decision, plus recently decided ones for context.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  const requests = await prisma.roleChangeRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      currentRole: true,
      requestedRole: true,
      reason: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          institution: true,
          department: true,
        },
      },
      reviewedBy: { select: { name: true } },
    },
  })

  return NextResponse.json(requests)
}
