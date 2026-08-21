import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/**
 * Resolve the exact redirect URI Google will call back.
 * Must match one of the "Authorized redirect URIs" in the Google Cloud console.
 */
function getRedirectUri(request: NextRequest) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI
  const origin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
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
