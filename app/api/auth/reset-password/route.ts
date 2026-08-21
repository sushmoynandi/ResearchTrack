import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  getSessionCookieOptions,
} from '@/lib/auth'

/** Wrong guesses allowed before the code is thrown away. */
const MAX_ATTEMPTS = 5

/**
 * POST /api/auth/reset-password
 * Trades a valid reset code for a new password, then signs the person in.
 * Works for Google accounts too — it simply gives them a password they didn't
 * have before, so afterwards either way of signing in works.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const cleanCode = typeof code === 'string' ? code.trim() : ''

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { error: 'Enter the code we sent to your email' },
        { status: 400 }
      )
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Your new password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const record = await prisma.passwordResetOtp.findFirst({
      where: { email: cleanEmail, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })

    // Expired or never requested — same message, nothing to learn from it
    if (!record) {
      return NextResponse.json(
        { error: 'That code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const isValid = await verifyPassword(cleanCode, record.codeHash)

    if (!isValid) {
      const attempts = record.attempts + 1

      if (attempts >= MAX_ATTEMPTS) {
        await prisma.passwordResetOtp.deleteMany({ where: { userId: record.userId } })
        return NextResponse.json(
          { error: 'Too many wrong codes. Please request a new one.' },
          { status: 429 }
        )
      }

      await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { attempts } })
      return NextResponse.json(
        { error: `Incorrect code. ${MAX_ATTEMPTS - attempts} attempts left.` },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } })
    if (!user || user.isActive === false) {
      return NextResponse.json({ error: 'This account is not available.' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(newPassword) },
      }),
      // The code is spent, and so is any other one for this account
      prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action: 'PASSWORD_RESET',
          resource: `user:${user.id}`,
          details: 'Password set through the forgot-password flow',
          severity: 'WARNING',
        },
      }),
    ])

    // Admins still have to go through 2-step verification, so don't hand them a
    // session here — send them to the normal sign-in instead.
    if (user.systemRole === 'ADMIN') {
      return NextResponse.json({ success: true, signedIn: false })
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      institution: user.institution,
      department: user.department,
      image: user.image,
      isGuest: false,
      provider: user.provider,
      twoFactorSetupDone: user.twoFactorSetupDone,
    })

    const response = NextResponse.json({
      success: true,
      signedIn: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        institution: user.institution,
        department: user.department,
        systemRole: user.systemRole,
        provider: user.provider,
        isGuest: false,
      },
    })

    const cookieOptions = getSessionCookieOptions(30)
    response.cookies.set({ ...cookieOptions, value: token })
    response.cookies.set({ ...cookieOptions, name: 'papertrack_session', value: token })
    return response
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Could not reset your password' }, { status: 500 })
  }
}
