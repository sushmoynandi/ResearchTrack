import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
// Google's public signing keys — jose fetches + caches these automatically
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

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

function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}

/**
 * Send the user back to the page they started from (login or register) with a
 * code the UI turns into a toast.
 */
function fail(request: NextRequest, code: string, mode: string = 'login') {
  const page = mode === 'register' ? '/register' : '/login'
  return NextResponse.redirect(new URL(`${page}?error=${code}`, request.url))
}

// GET /api/auth/google/callback  → Google redirects here after the user approves
export async function GET(request: NextRequest) {
  const url = request.nextUrl

  const cookieStore = await cookies()
  const savedState = cookieStore.get('g_oauth_state')?.value
  const redirectTarget = safeRedirect(cookieStore.get('g_oauth_redirect')?.value)
  // Which button they pressed: "Sign up with Google" or "Continue with Google"
  const mode = cookieStore.get('g_oauth_mode')?.value === 'register' ? 'register' : 'login'

  // The user cancelled or Google returned an error
  if (url.searchParams.get('error')) {
    return fail(request, 'google_denied', mode)
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // CSRF protection: the state we sent must come back untouched
  if (!code || !state || !savedState || state !== savedState) {
    return fail(request, 'google_state', mode)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return fail(request, 'google_not_configured', mode)
  }

  // ── 1. Exchange the one-time code for tokens (server-to-server) ──
  let idToken: string
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text())
      return fail(request, 'google_token', mode)
    }

    const tokenData = await tokenRes.json()
    idToken = tokenData.id_token
    if (!idToken) return fail(request, 'google_token', mode)
  } catch (err) {
    console.error('Google token exchange error:', err)
    return fail(request, 'google_token', mode)
  }

  // ── 2. Verify the ID token signature, issuer and audience ──
  let payload: Record<string, unknown>
  try {
    const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    payload = verified.payload as Record<string, unknown>
  } catch (err) {
    console.error('Google ID token verification failed:', err)
    return fail(request, 'google_verify', mode)
  }

  const email = (payload.email as string | undefined)?.trim().toLowerCase()
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true'
  const sub = payload.sub as string | undefined
  const name = (payload.name as string | undefined)?.trim() || email?.split('@')[0] || 'Google Researcher'
  const picture = (payload.picture as string | undefined) || null

  if (!email || !emailVerified || !sub) {
    return fail(request, 'google_email', mode)
  }

  // ── 3. Find or create the researcher account ──
  //
  // "Continue with Google" on the LOGIN page only signs people in — it never
  // creates an account. Signing up is a deliberate act, so an unknown email is
  // sent back to the login page with a nudge to register first.
  //
  // If the email already belongs to an account — including one registered
  // manually with a password — the Google identity is linked to it and they
  // are signed straight in, from either page.
  let user
  try {
    user = await prisma.user.findUnique({ where: { email } })

    if (!user && mode !== 'register') {
      return fail(request, 'google_no_account', 'login')
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          image: picture,
          role: 'STUDENT',
          systemRole: 'STUDENT',
          provider: 'GOOGLE',
          providerId: sub,
        },
      })

      // Pre-seed a landmark paper so new Google users don't land on an empty library
      try {
        await prisma.paper.create({
          data: {
            userId: user.id,
            title: 'Attention Is All You Need',
            authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, et al.',
            abstract:
              'We propose the Transformer, a new simple network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
            doi: '10.48550/arXiv.1706.03762',
            url: 'https://arxiv.org/abs/1706.03762',
            journal: 'NeurIPS 2017',
            publicationYear: 2017,
            status: 'COMPLETED',
            priority: 'CRITICAL',
            isFavorite: true,
            architecture: 'Dense Transformer',
            parameters: '65M (Base)',
            contextWindow: '512 tokens',
            replicationStatus: 'REPLICATED',
            problemSolved: 'Overcoming the sequential bottleneck of RNNs with parallelizable self-attention.',
            keyContribution: 'Multi-Head Self-Attention architecture without recurrence.',
            tags: {
              create: [
                { name: 'transformer', userId: user.id },
                { name: 'foundational', userId: user.id },
              ],
            },
          },
        })
      } catch {
        // non-blocking
      }
    } else {
      // Existing account: attach the Google identity without clobbering a
      // password-based (CREDENTIALS) provider, so they keep both sign-in options.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          providerId: user.providerId || sub,
          image: user.image || picture,
          provider: user.provider === 'CREDENTIALS' ? user.provider : 'GOOGLE',
        },
      })
    }
  } catch (err) {
    console.error('Google user upsert error:', err)
    return fail(request, 'google_account', mode)
  }

  if (user.isActive === false) {
    return fail(request, 'account_disabled', mode)
  }

  // ── 4. Issue the same session cookie the password flow uses ──
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
    twoFactorSetupDone: user.twoFactorSetupDone,
  })

  const sessionCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  }

  // Anyone who hasn't picked a role / institution / department yet finishes
  // that first — `proxy.ts` enforces the same rule on every other page.
  const needsProfile = !user.institution?.trim() || !user.department?.trim()
  const destination = needsProfile
    ? `/welcome${redirectTarget !== '/' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`
    : user.systemRole === 'ADMIN'
      ? '/admin/users'
      : redirectTarget
  const response = NextResponse.redirect(new URL(destination, request.url))

  response.cookies.set('researchtrack_session', sessionToken, sessionCookie)
  response.cookies.set('papertrack_session', sessionToken, sessionCookie)

  // Clean up the short-lived flow cookies
  response.cookies.set('g_oauth_state', '', { ...sessionCookie, maxAge: 0 })
  response.cookies.set('g_oauth_redirect', '', { ...sessionCookie, maxAge: 0 })
  response.cookies.set('g_oauth_mode', '', { ...sessionCookie, maxAge: 0 })

  return response
}
