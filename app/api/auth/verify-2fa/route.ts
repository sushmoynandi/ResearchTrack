import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify2FAToken, verifyPassword, createSessionToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// POST /api/auth/verify-2fa — Verify Admin 6-digit OTP code and issue session
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
        { error: 'Administrator account not found or deactivated' },
        { status: 401 }
      )
    }

    // 3. Find latest active OTP challenge
    const otpRecord = await prisma.twoFactorOtp.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Verification code has expired or was not found. Please click Resend Code.' },
        { status: 400 }
      )
    }

    // 4. Verify code against hash
    const isValid = await verifyPassword(cleanCode, otpRecord.codeHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect verification code. Please check your email and try again.' },
        { status: 401 }
      )
    }

    // 5. Clean up used OTP challenges
    await prisma.twoFactorOtp.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 6. Create full authenticated session token
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
      message: 'Two-factor verification successful! Welcome to the Admin Console.',
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
