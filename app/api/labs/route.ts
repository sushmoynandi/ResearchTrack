import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { recordAuditLog } from '@/lib/audit'

// GET /api/labs — Fetch all labs the user is a member of or leads
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    if (all) {
      // Discoverable public directory of labs
      const publicLabs = await prisma.lab.findMany({
        include: {
          lead: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true, groups: true } },
        },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(publicLabs)
    }

    // User's own enrolled/led labs
    const userLabs = await prisma.lab.findMany({
      where: {
        OR: [
          { leadId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, department: true, systemRole: true } },
          },
        },
        groups: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        joinRequests: {
          where: { status: 'PENDING' },
          include: {
            user: { select: { id: true, name: true, email: true, department: true } },
          },
        },
        _count: { select: { members: true, groups: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(userLabs)
  } catch (error) {
    console.error('Error fetching labs:', error)
    return NextResponse.json({ error: 'Failed to fetch research labs' }, { status: 500 })
  }
}

// POST /api/labs — Create a new academic research lab (Supervisor / Admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.systemRole !== 'SUPERVISOR' && user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only faculty supervisors and administrators can create research labs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, institution, department, description, customJoinCode } = body

    if (!name || !institution) {
      return NextResponse.json({ error: 'Lab name and institution are required' }, { status: 400 })
    }

    // Generate unique slug & 6-char join code
    const cleanName = name.trim()
    const baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`

    const generatedCode = (customJoinCode?.trim() || `${cleanName.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`)
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()

    // Create Lab + automatically add Lead as LabMember with role LEAD
    const lab = await prisma.lab.create({
      data: {
        name: cleanName,
        slug,
        joinCode: generatedCode,
        institution: institution.trim(),
        department: department?.trim() || null,
        description: description?.trim() || null,
        leadId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'LEAD',
          },
        },
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    // Record governance audit log
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'LAB_CREATED',
      resource: `Lab: ${lab.name} (${lab.joinCode})`,
      details: `Academic research lab founded by ${user.name} at ${lab.institution}.`,
      severity: 'INFO',
    })

    return NextResponse.json(lab, { status: 201 })
  } catch (error: any) {
    console.error('Error creating lab:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A lab with this join code or name already exists. Please choose another.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create research lab' }, { status: 500 })
  }
}
