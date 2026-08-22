import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth'
import { AuthProvider } from '@prisma/client'
import { cookies } from 'next/headers'

interface RouteParams {
  params: Promise<{ provider: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { provider } = await params
    const body = await request.json()
    const { email, name, avatarUrl, providerAccountId, institution } = body

    const validProviders: Record<string, AuthProvider> = {
      github: 'GITHUB',
      google: 'GOOGLE',
      orcid: 'ORCID',
    }

    const authProvider = validProviders[provider.toLowerCase()]
    if (!authProvider) {
      return NextResponse.json({ error: `Unsupported OAuth provider: ${provider}` }, { status: 400 })
    }

    const providerAccount = providerAccountId || `ext_${crypto.randomUUID().slice(0, 8)}`
    const userEmail = (email || `${provider.toLowerCase()}_user_${providerAccount.slice(0, 6)}@papertrack.auth`).trim().toLowerCase()
    const userName = name?.trim() || `${provider.toUpperCase()} Researcher`

    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: userName,
          email: userEmail,
          image: avatarUrl || null,
          institution: institution || 'Research Institute',
          role: 'STUDENT',
          provider: authProvider,
          providerId: providerAccount,
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: authProvider,
          providerId: providerAccount,
          image: avatarUrl || user.image,
        },
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
      isGuest: false,
      provider: user.provider,
      twoFactorEnabled: user.twoFactorEnabled,
    })

    const cookieOptions = getSessionCookieOptions(30)

    try {
      const cookieStore = await cookies()
      cookieStore.set({ ...cookieOptions, value: sessionToken })
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
        image: user.image,
      },
    })

    response.cookies.set({ ...cookieOptions, value: sessionToken })
    return response
  } catch (error) {
    console.error('OAuth sign in error:', error)
    return NextResponse.json({ error: 'Failed to process OAuth sign in' }, { status: 500 })
  }
}
