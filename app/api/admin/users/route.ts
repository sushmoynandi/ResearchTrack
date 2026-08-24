import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { hashPassword } from '@/lib/auth'

// GET /api/admin/users — List all users in system (Admin only)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        institution: true,
        department: true,
        systemRole: true,
        provider: true,
        isGuest: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            papers: true,
            collections: true,
            notes: true,
            tags: true,
            students: true,
            assignedPapers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const supervisors = await prisma.user.findMany({
      where: { systemRole: 'SUPERVISOR', isActive: true },
      select: { id: true, name: true, email: true, department: true },
    })

    return NextResponse.json({ users, supervisors })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// PUT /api/admin/users — Update user role, supervisor, or status (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, systemRole, supervisorId, department, institution, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent sole admin from demoting or deactivating themselves
    if (id === user.id && ((systemRole && systemRole !== 'ADMIN') || isActive === false)) {
      const otherAdmins = await prisma.user.count({
        where: { systemRole: 'ADMIN', isActive: true, id: { not: user.id } },
      })
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot demote or deactivate the sole remaining administrator account' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (systemRole) updateData.systemRole = systemRole
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId || null
    if (department !== undefined) updateData.department = department?.trim() || null
    if (institution !== undefined) updateData.institution = institution?.trim() || null
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        institution: true,
        department: true,
        isActive: true,
        supervisorId: true,
      },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// POST /api/admin/users — Create new user directly (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, systemRole = 'STUDENT', institution, department, supervisorId } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })

    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        systemRole,
        institution: institution?.trim() || null,
        department: department?.trim() || null,
        supervisorId: supervisorId || null,
        provider: 'CREDENTIALS',
      },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        institution: true,
        department: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating user by admin:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// DELETE /api/admin/users — Permanently delete a user account (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getCurrentUser()
    if (!adminUser || adminUser.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || searchParams.get('userId')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own administrator account' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, systemRole: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Perform complete cascading cleanup across all referencing tables
    const fallbackAdmin =
      (await prisma.user.findFirst({
        where: { systemRole: 'ADMIN', id: { not: id } },
        select: { id: true },
      })) || adminUser

    await prisma.$transaction([
      // 1. Clear supervisor links
      prisma.user.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } }),

      // 2. Transfer or clear lab leads
      prisma.lab.updateMany({ where: { leadId: id }, data: { leadId: fallbackAdmin.id } }),

      // 3. Thesis Milestones & Evaluation Rubrics
      prisma.thesisMilestone.deleteMany({ where: { OR: [{ studentId: id }, { supervisorId: id }] } }),
      prisma.reviewRubric.deleteMany({ where: { OR: [{ supervisorId: id }, { studentId: id }] } }),

      // 4. Feedback & Assignments
      prisma.feedback.deleteMany({ where: { OR: [{ authorId: id }, { targetUserId: id }] } }),
      prisma.assignment.deleteMany({ where: { OR: [{ studentId: id }, { assignedById: id }] } }),

      // 5. Meetings (1-on-1 & Lab)
      prisma.meeting.deleteMany({ where: { OR: [{ studentId: id }, { supervisorId: id }] } }),
      prisma.labMeeting.deleteMany({ where: { hostId: id } }),

      // 6. Lab & Group Memberships, Requests & Content
      prisma.journalClubSession.deleteMany({ where: { presenterId: id } }),
      prisma.labBroadcast.deleteMany({ where: { authorId: id } }),
      prisma.labJoinRequest.deleteMany({ where: { userId: id } }),
      prisma.groupMember.deleteMany({ where: { userId: id } }),
      prisma.labMember.deleteMany({ where: { userId: id } }),

      // 7. Audit Logs & Notifications
      prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.notification.deleteMany({ where: { userId: id } }),

      // 8. User notes, tags, collections, and papers
      prisma.note.deleteMany({ where: { userId: id } }),
      prisma.tag.deleteMany({ where: { userId: id } }),
      prisma.collection.deleteMany({ where: { userId: id } }),
      prisma.paper.deleteMany({ where: { userId: id } }),

      // 9. Finally delete the user account
      prisma.user.delete({ where: { id } }),
    ])

    return NextResponse.json({
      success: true,
      message: `Account for ${target.name} (${target.email}) permanently deleted`,
    })
  } catch (error) {
    console.error('Error deleting user by admin:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
