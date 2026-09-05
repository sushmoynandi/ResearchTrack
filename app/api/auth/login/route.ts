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

    // ─── 2-STEP VERIFICATION ────────────────────────────────
    // Any account can switch this on, whatever its role. Whichever way they
    // chose to receive the code, the challenge screen is the same.
    if (user.twoFactorEnabled && user.twoFactorMethod) {
      const { create2FAToken } = await import('@/lib/auth')

      // Email codes have to be sent now; app codes are already on their phone.
      if (user.twoFactorMethod === 'EMAIL') {
        const { generate6DigitCode, sendTwoFactorOtpEmail } = await import('@/lib/email')
        const { hashPassword } = await import('@/lib/auth')

        await prisma.twoFactorOtp.deleteMany({ where: { userId: user.id } }).catch(() => {})

        const code = generate6DigitCode()
        await prisma.twoFactorOtp.create({
          data: {
            userId: user.id,
            email: user.email,
            codeHash: await hashPassword(code),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })

        await sendTwoFactorOtpEmail({
          toEmail: user.email,
          recipientName: user.name,
          code,
          ip:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1',
        })
      }

      const tempToken = await create2FAToken({ userId: user.id, email: user.email })

      return NextResponse.json({
        requires2FA: true,
        method: user.twoFactorMethod,
        tempToken,
        email: user.email,
        message:
          user.twoFactorMethod === 'APP'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'We’ve emailed you a 6-digit code.',
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
