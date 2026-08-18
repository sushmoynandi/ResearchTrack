import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const AUTH_COOKIE_NAME = 'papertrack_session'
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'papertrack-super-secret-jwt-key-2026-researcher'
const key = new TextEncoder().encode(JWT_SECRET_KEY)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files, next internal files, uploads, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // Check token from cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  let isAuthenticated = false

  if (token) {
    try {
      await jwtVerify(token, key, { clockTolerance: 30 })
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  // If user is already authenticated and visits login/register, redirect to dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
