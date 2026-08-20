import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { recordAuditLog } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/labs/[id] — Fetch detailed lab profile, roster, and groups
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const lab = await prisma.lab.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, department: true, systemRole: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        groups: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, department: true, systemRole: true } },
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
      },
    })

    if (!lab) {
      return NextResponse.json({ error: 'Research lab not found' }, { status: 404 })
    }

    return NextResponse.json(lab)
  } catch (error) {
    console.error('Error fetching lab details:', error)
    return NextResponse.json({ error: 'Failed to fetch lab details' }, { status: 500 })
  }
}

// PUT /api/labs/[id] — Update lab profile (Lead or Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, institution, department, description, joinCode } = body

    const existing = await prisma.lab.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    if (existing.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead or administrator can edit this lab' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name.trim()
    if (institution) updateData.institution = institution.trim()
    if (department !== undefined) updateData.department = department?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (joinCode) updateData.joinCode = joinCode.trim().toUpperCase()

    const updated = await prisma.lab.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating lab:', error)
    return NextResponse.json({ error: 'Failed to update lab' }, { status: 500 })
  }
}

// DELETE /api/labs/[id] — Delete lab (Lead or Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.lab.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    if (existing.leadId !== user.id && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only the lab lead or administrator can delete this lab' }, { status: 403 })
    }

    await prisma.lab.delete({
      where: { id },
    })

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'LAB_DELETED',
      resource: `Lab: ${existing.name}`,
      details: `Academic lab dissolved by ${user.name}.`,
      severity: 'WARNING',
    })

    return NextResponse.json({ success: true, message: 'Lab dissolved successfully' })
  } catch (error) {
    console.error('Error deleting lab:', error)
    return NextResponse.json({ error: 'Failed to delete lab' }, { status: 500 })
  }
}
