import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** Is this a localhost / loopback address? */
function isLoopback(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url)
}

/** The address the visitor is actually on, as their browser sees it. */
function publicOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!host) return request.nextUrl.origin.replace(/\/$/, '')
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Resolve the exact redirect URI Google will call back.
 * Must match one of the "Authorized redirect URIs" in the Google Cloud console.
 *
 * The address the visitor is actually on wins, because that is the string
 * Google compares. A configured value is honoured on top of it, except when it
 * points at localhost while the visitor is not — a development value left
 * behind in a deployed environment would otherwise send people on the live site
 * back to their own machine.
 */
function getRedirectUri(request: NextRequest) {
  const origin = publicOrigin(request)

  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  const configured =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (configuredBase ? `${configuredBase}/api/auth/google/callback` : '')

  if (configured && (!isLoopback(configured) || isLoopback(origin))) {
    return configured
  }

  return `${origin}/api/auth/google/callback`
}

/**
 * Only allow same-site relative redirects to avoid open-redirect abuse.
 */
function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}

// GET /api/auth/google  → kicks off the Google sign-in flow
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    // Google isn't configured yet — send the user back with a friendly hint
    return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url))
  }

  const redirectTarget = safeRedirect(request.nextUrl.searchParams.get('redirect'))
  const mode = request.nextUrl.searchParams.get('mode') === 'register' ? 'register' : 'login'

  // Random anti-CSRF state, checked again in the callback
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
  })

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)

  const tempCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes to complete the round-trip
  }

  response.cookies.set('g_oauth_state', state, tempCookie)
  response.cookies.set('g_oauth_redirect', redirectTarget, tempCookie)
  response.cookies.set('g_oauth_mode', mode, tempCookie)

  return response
}
