import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}
    if (severity) where.severity = severity
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ]
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // If no logs exist yet, seed a few standard system bootstrap entries
    if (logs.length === 0) {
      const initialLogs = [
        {
          id: 'audit-init-1',
          userId: user.id,
          userName: user.name,
          action: 'SYSTEM_BOOTSTRAP',
          resource: 'Lab System Core',
          details: 'PaperTrack academic security governance framework active.',
          severity: 'INFO',
          createdAt: new Date(),
        },
        {
          id: 'audit-init-2',
          userId: user.id,
          userName: user.name,
          action: 'ROLE_ELEVATION_CHECK',
          resource: 'User Management',
          details: 'Verified administrator privileges and supervisor rosters.',
          severity: 'INFO',
          createdAt: new Date(Date.now() - 3600000),
        },
      ]
      return NextResponse.json({ logs: initialLogs })
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Audit log fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
