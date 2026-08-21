import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const key = new TextEncoder().encode(
  process.env.JWT_SECRET || 'researchtrack-super-secret-jwt-key-2026-researcher'
)

/** Pages a signed-in person can always reach, finished profile or not. */
const ALWAYS_ALLOWED = ['/login', '/register', '/welcome']

function isAllowed(pathname: string) {
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/_next/')) return true
  // static files (favicon, sw.js, images, fonts…)
  if (pathname.includes('.')) return true
  return ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Everyone must finish the one-time profile step (role + institution +
 * department) before they can use the rest of the app. A signed-in person whose
 * session is still missing an institution or department is sent to /welcome,
 * whichever page they asked for.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAllowed(pathname)) return NextResponse.next()

  const token =
    request.cookies.get('researchtrack_session')?.value ||
    request.cookies.get('papertrack_session')?.value

  // Not signed in — each page already handles its own redirect to /login
  if (!token) return NextResponse.next()

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      clockTolerance: 15,
    })

    const institution = typeof payload.institution === 'string' ? payload.institution.trim() : ''
    const department = typeof payload.department === 'string' ? payload.department.trim() : ''

    if (!institution || !department) {
      const url = request.nextUrl.clone()
      url.pathname = '/welcome'
      url.search = pathname === '/' ? '' : `?redirect=${encodeURIComponent(pathname)}`
      return NextResponse.redirect(url)
    }
  } catch {
    // Unreadable / expired token — leave it to the page's own auth handling
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
