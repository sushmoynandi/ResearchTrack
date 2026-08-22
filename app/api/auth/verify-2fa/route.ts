import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify2FAToken, createSessionToken, verifyPassword } from '@/lib/auth'
import { verifyTwoFactorCode } from '@/lib/totp'
import { cookies } from 'next/headers'

// POST /api/auth/verify-2fa — Check the 6-digit code and issue the session.
// Any account can have two-step verification on, not just administrators.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempToken, code } = body

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and 6-digit verification code are required' },
        { status: 400 }
      )
    }

    const cleanCode = String(code).trim()
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit numeric verification code' },
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

    if (!user || user.isActive === false) {
      return NextResponse.json(
        { error: 'Account not found or deactivated' },
        { status: 401 }
      )
    }

    // 3. Check the code the way this person chose to receive it
    if (!user.twoFactorEnabled || !user.twoFactorMethod) {
      return NextResponse.json(
        { error: 'Two-factor is not set up on this account. Please sign in again.' },
        { status: 400 }
      )
    }

    let isValid = false

    if (user.twoFactorMethod === 'APP') {
      isValid = Boolean(
        user.twoFactorSecret && (await verifyTwoFactorCode(user.twoFactorSecret, cleanCode))
      )
    } else {
      const otp = await prisma.twoFactorOtp.findFirst({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })

      if (!otp) {
        return NextResponse.json(
          { error: 'That code has expired. Please sign in again to get a new one.' },
          { status: 400 }
        )
      }

      isValid = await verifyPassword(cleanCode, otp.codeHash)
      if (isValid) {
        await prisma.twoFactorOtp.deleteMany({ where: { userId: user.id } }).catch(() => {})
      }
    }

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            user.twoFactorMethod === 'APP'
              ? 'Incorrect code. Check your authenticator app and try the next one.'
              : 'Incorrect code. Check your email and try again.',
        },
        { status: 401 }
      )
    }

    // 4. Create full authenticated session token
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      institution: user.institution,
      department: user.department,
      image: user.image,
      isGuest: user.isGuest,
      provider: user.provider,
      twoFactorEnabled: user.twoFactorEnabled,
    })

    const isProd = process.env.NODE_ENV === 'production'
    const cookieConfig = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    }

    try {
      const cookieStore = await cookies()
      cookieStore.set('researchtrack_session', sessionToken, cookieConfig)
      cookieStore.set('papertrack_session', sessionToken, cookieConfig)
    } catch {
      // fallback
    }

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        institution: user.institution,
        department: user.department,
        image: user.image,
        isGuest: user.isGuest,
      },
      message: 'Two-step verification successful.',
    })

    response.cookies.set('researchtrack_session', sessionToken, cookieConfig)
    response.cookies.set('papertrack_session', sessionToken, cookieConfig)
    return response
  } catch (error: any) {
    console.error('Verify 2FA error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to verify 2FA code' },
      { status: 500 }
    )
  }
}
