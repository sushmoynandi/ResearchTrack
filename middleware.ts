import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'researchtrack-super-secret-jwt-key-2026-researcher'
const key = new TextEncoder().encode(JWT_SECRET_KEY)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow public static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // 2. Check token from cookie
  const token =
    request.cookies.get('researchtrack_session')?.value ||
    request.cookies.get('papertrack_session')?.value

  let isAuthenticated = false

  if (token && token.trim().length > 10) {
    try {
      await jwtVerify(token.trim(), key, { clockTolerance: 30 })
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')

  // 3. If unauthenticated and accessing a protected page -> Redirect directly to /login
  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 4. If already authenticated and accessing login/register -> Redirect directly to /
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json).*)',
  ],
}
