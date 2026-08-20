import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSessionToken, getSessionCookieOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'Account has been deactivated. Contact your administrator.' },
        { status: 403 }
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // ─── ADMIN 2-STEP VERIFICATION ──────────────────────────
    if (user.systemRole === 'ADMIN') {
      const { generate6DigitCode, sendAdmin2FACode } = await import('@/lib/appscript2fa')
      const { create2FAToken, hashPassword } = await import('@/lib/auth')

      // Clear any pending verification codes for this admin
      await prisma.twoFactorOtp.deleteMany({
        where: { userId: user.id },
      }).catch(() => {})

      // Generate fresh 6-digit OTP
      const code = generate6DigitCode()
      const codeHash = await hashPassword(code)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store in database
      await prisma.twoFactorOtp.create({
        data: {
          userId: user.id,
          email: user.email,
          codeHash,
          expiresAt,
        },
      })

      // Generate signed temporary 2FA token
      const tempToken = await create2FAToken({
        userId: user.id,
        email: user.email,
      })

      // Send OTP via Google Apps Script (or development logger)
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
        requires2FA: true,
        tempToken,
        email: user.email,
        message: 'A 6-digit verification code has been dispatched to your administrator email.',
      })
    }

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
    })

    response.cookies.set('researchtrack_session', sessionToken, cookieConfig)
    response.cookies.set('papertrack_session', sessionToken, cookieConfig)
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to sign in', details: error?.message || String(error), stack: error?.stack },
      { status: 500 }
    )
  }
}
