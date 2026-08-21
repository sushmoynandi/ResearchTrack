import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/user/account
 * Permanently removes the signed-in person's account and everything attached
 * to it.
 *
 * Papers, notes, tags, collections, shares, lab memberships and push
 * subscriptions are removed automatically by the database (they cascade off
 * User). The rows below reference a user without cascading, so they're cleared
 * here first — otherwise the delete fails on a foreign-key constraint.
 */
export async function DELETE() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = sessionUser.id

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // A lab lead can't just vanish — other members' work hangs off the lab.
    const ledLabs = await prisma.lab.findMany({
      where: { leadId: userId },
      select: { name: true },
    })
    if (ledLabs.length > 0) {
      const names = ledLabs.map((l) => `"${l.name}"`).join(', ')
      return NextResponse.json(
        {
          error:
            `You're still the lead of ${names}. Hand the lab over to someone else ` +
            `(or delete the lab) before deleting your account.`,
        },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      // Students supervised by this person keep their accounts, just unlinked
      prisma.user.updateMany({ where: { supervisorId: userId }, data: { supervisorId: null } }),
      // Lab tasks handed to them stay in the lab, just unassigned
      prisma.labTask.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } }),

      prisma.labTask.deleteMany({ where: { createdById: userId } }),
      prisma.journalClubSession.deleteMany({ where: { presenterId: userId } }),
      prisma.labMeeting.deleteMany({ where: { hostId: userId } }),
      prisma.labBroadcast.deleteMany({ where: { authorId: userId } }),
      prisma.thesisMilestone.deleteMany({
        where: { OR: [{ studentId: userId }, { supervisorId: userId }] },
      }),
      prisma.reviewRubric.deleteMany({
        where: { OR: [{ studentId: userId }, { supervisorId: userId }] },
      }),
      prisma.meeting.deleteMany({
        where: { OR: [{ studentId: userId }, { supervisorId: userId }] },
      }),
      prisma.feedback.deleteMany({
        where: { OR: [{ authorId: userId }, { targetUserId: userId }] },
      }),
      prisma.assignment.deleteMany({
        where: { OR: [{ studentId: userId }, { assignedById: userId }] },
      }),

      prisma.user.delete({ where: { id: userId } }),
    ])

    // Sign them out — the account behind these cookies no longer exists
    const response = NextResponse.json({ success: true })
    const expire = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    }
    response.cookies.set('researchtrack_session', '', expire)
    response.cookies.set('papertrack_session', '', expire)
    return response
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete your account' }, { status: 500 })
  }
}
