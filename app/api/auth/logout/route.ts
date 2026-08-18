import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const isProd = process.env.NODE_ENV === 'production'
  const expireConfig = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  }

  try {
    const cookieStore = await cookies()
    cookieStore.delete('researchtrack_session')
    cookieStore.delete('papertrack_session')
    cookieStore.set('researchtrack_session', '', expireConfig)
    cookieStore.set('papertrack_session', '', expireConfig)
  } catch {
    // fallback
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })

  response.cookies.delete('researchtrack_session')
  response.cookies.delete('papertrack_session')
  response.cookies.set('researchtrack_session', '', expireConfig)
  response.cookies.set('papertrack_session', '', expireConfig)

  return response
}
