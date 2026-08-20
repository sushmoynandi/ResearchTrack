import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify2FAToken, hashPassword } from '@/lib/auth'
import { generate6DigitCode, sendAdmin2FACode } from '@/lib/appscript2fa'

// POST /api/auth/resend-2fa — Resend Admin 6-digit OTP code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempToken } = body

    if (!tempToken) {
      return NextResponse.json(
        { error: 'Temporary verification token is required' },
        { status: 400 }
      )
    }

    // 1. Verify signed temporary 2FA token
    const tokenPayload = await verify2FAToken(tempToken)
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Verification session has expired. Please sign in again.' },
        { status: 401 }
      )
    }

    // 2. Fetch User
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
    })

    if (!user || user.isActive === false || user.systemRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Administrator account not authorized' },
        { status: 401 }
      )
    }

    // 3. Rate limiting (minimum 25 seconds between resends)
    const recentOtp = await prisma.twoFactorOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOtp) {
      const elapsedMs = Date.now() - new Date(recentOtp.createdAt).getTime()
      if (elapsedMs < 25 * 1000) {
        const remainingSec = Math.ceil((25 * 1000 - elapsedMs) / 1000)
        return NextResponse.json(
          { error: `Please wait ${remainingSec}s before requesting another verification code.` },
          { status: 429 }
        )
      }
    }

    // 4. Delete old OTPs
    await prisma.twoFactorOtp.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 5. Generate fresh 6-digit OTP
    const code = generate6DigitCode()
    const codeHash = await hashPassword(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.twoFactorOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash,
        expiresAt,
      },
    })

    // 6. Send OTP via Google Apps Script
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    await sendAdmin2FACode({
      email: user.email,
      name: user.name,
      code,
      ip: clientIp,
    })

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.',
    })
  } catch (error: any) {
    console.error('Resend 2FA error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to resend verification code' },
      { status: 500 }
    )
  }
}
