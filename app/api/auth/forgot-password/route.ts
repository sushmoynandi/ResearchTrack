import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import {
  generate6DigitCode,
  sendPasswordResetCode,
  isMailerConfigured,
} from '@/lib/appscript2fa'

const CODE_TTL_MINUTES = 15
/** Don't let someone spam an inbox — one code a minute per address. */
const RESEND_COOLDOWN_MS = 60 * 1000

/**
 * POST /api/auth/forgot-password
 * Emails a 6-digit reset code. The reply is deliberately identical whether or
 * not the address has an account, so this can't be used to discover who is
 * registered.
 *
 * If email can't be sent, no code is created and none is ever shown or logged —
 * the caller is told to sign in with Google instead. Putting a reset code
 * anywhere other than the account holder's inbox would defeat the point of it.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    // Nothing about this depends on the address, so answering early leaks nothing
    if (!isMailerConfigured()) {
      return NextResponse.json({ success: false, emailUnavailable: true })
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } })

    // Same answer either way
    const ok = NextResponse.json({
      success: true,
      message: 'If that address has an account, a reset code is on its way.',
    })

    if (!user || user.isActive === false) return ok

    const recent = await prisma.passwordResetOtp.findFirst({
      where: { email: cleanEmail, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    })
    if (recent) return ok

    // One live code per account
    await prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } })

    const code = generate6DigitCode()
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: cleanEmail,
        codeHash: await hashPassword(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      },
    })

    const { delivered } = await sendPasswordResetCode({
      email: cleanEmail,
      name: user.name,
      code,
      ip: request.headers.get('x-forwarded-for') || undefined,
    })

    // The mail bounced at our end — drop the code rather than leave a live one
    // nobody can receive, and point them at Google sign-in.
    if (!delivered) {
      await prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } })
      return NextResponse.json({ success: false, emailUnavailable: true })
    }

    return ok
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Could not start the reset' }, { status: 500 })
  }
}
