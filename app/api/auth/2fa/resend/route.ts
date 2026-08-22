import { NextRequest, NextResponse } from 'next/server'
import { verify2FAToken, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generate6DigitCode, sendTwoFactorCode } from '@/lib/appscript2fa'

/**
 * Send the emailed sign-in code again.
 *
 * Only reachable while a sign-in is half-finished — it needs the short-lived
 * token the password step handed out, so it can't be used to post mail at an
 * arbitrary address. Codes sent less than a minute apart are refused, and the
 * previous code stops working the moment a new one goes out.
 */

const RESEND_COOLDOWN_MS = 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const { tempToken } = await request.json()

    const payload = typeof tempToken === 'string' ? await verify2FAToken(tempToken) : null
    if (!payload) {
      return NextResponse.json(
        { error: 'This sign-in has expired. Please start again.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || user.isActive === false || !user.twoFactorEnabled) {
      return NextResponse.json({ error: 'Account not available' }, { status: 401 })
    }

    // Nothing to resend for an authenticator app — the code lives on the phone
    if (user.twoFactorMethod !== 'EMAIL') {
      return NextResponse.json(
        { error: 'Your codes come from your authenticator app.' },
        { status: 400 }
      )
    }

    const latest = await prisma.twoFactorOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (latest) {
      const waited = Date.now() - latest.createdAt.getTime()
      if (waited < RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          {
            error: 'Give it a moment before asking for another code.',
            retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - waited) / 1000),
          },
          { status: 429 }
        )
      }
    }

    // One live code at a time, so an older email can't be used later
    await prisma.twoFactorOtp.deleteMany({ where: { userId: user.id } }).catch(() => {})

    const code = generate6DigitCode()
    await prisma.twoFactorOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash: await hashPassword(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    })

    await sendTwoFactorCode({
      email: user.email,
      name: user.name,
      code,
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        undefined,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not send another code' }, { status: 500 })
  }
}
