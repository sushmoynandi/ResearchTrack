import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { generate6DigitCode, sendTwoFactorCode } from '@/lib/appscript2fa'
import {
  createTwoFactorSecret,
  buildAuthenticatorSetup,
  verifyTwoFactorCode,
} from '@/lib/totp'

/**
 * Two-factor verification, open to every signed-in account.
 *
 * Both ways of receiving a code can be set up at the same time and kept side
 * by side; `twoFactorMethod` names the one actually used at sign-in, and can
 * be switched between whichever are ready. `twoFactorEnabled` is true while at
 * least one is configured.
 *
 * Administrators may not end up with none: the gate in proxy.ts holds them at
 * /security-setup whenever two-factor is off, so removing their last method
 * here is refused rather than dropping them into a redirect loop.
 */

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000

type Method = 'APP' | 'EMAIL'

async function signedInOrNull() {
  try {
    return await requireUser()
  } catch {
    return null
  }
}

/** Check a code against whichever method it should have come from. */
async function codeMatches(
  account: { id: string; twoFactorSecret: string | null },
  method: Method,
  code: string
): Promise<boolean> {
  if (method === 'APP') {
    if (!account.twoFactorSecret) return false
    return verifyTwoFactorCode(account.twoFactorSecret, code)
  }

  const otp = await prisma.twoFactorOtp.findFirst({
    where: { userId: account.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!otp) return false
  return verifyPassword(code, otp.codeHash)
}

/** GET — what's set up right now. */
export async function GET() {
  const me = await signedInOrNull()
  if (!me) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 403 })
  }

  const account = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
      twoFactorSecret: true,
      twoFactorEmailReady: true,
      email: true,
      systemRole: true,
    },
  })

  return NextResponse.json({
    enabled: Boolean(account?.twoFactorEnabled),
    method: account?.twoFactorMethod ?? null,
    appReady: Boolean(account?.twoFactorSecret),
    emailReady: Boolean(account?.twoFactorEmailReady),
    email: account?.email ?? null,
    // Administrators can't be left with nothing, so the card hides the controls
    // that would do it rather than offering a button that always fails
    mustKeepOne: account?.systemRole === 'ADMIN',
  })
}

/**
 * POST — one endpoint, several steps chosen with `action`:
 *   start-app    → make a secret and hand back a QR (nothing saved yet)
 *   send-email   → post a code to their address so they can prove it arrives
 *   enable       → check the code, mark that method ready
 *   set-primary  → switch which ready method is used at sign-in
 *   remove       → check the code, take one method away
 *   disable      → check the code, switch everything off
 */
export async function POST(request: NextRequest) {
  const me = await signedInOrNull()
  if (!me) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const action = body.action as string
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const method: Method = body.method === 'EMAIL' ? 'EMAIL' : 'APP'
    const secretFromClient = typeof body.secret === 'string' ? body.secret : ''

    const account = await prisma.user.findUnique({ where: { id: me.id } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const isAdmin = account.systemRole === 'ADMIN'
    const appReady = Boolean(account.twoFactorSecret)
    const emailReady = Boolean(account.twoFactorEmailReady)

    const audit = (what: string) =>
      prisma.auditLog.create({
        data: {
          userId: account.id,
          userName: account.name,
          action: 'TWO_FACTOR_CHANGED',
          resource: `user:${account.id}`,
          details: what,
          severity: 'INFO',
        },
      })

    // ── Authenticator app: hand back a QR to scan ──
    if (action === 'start-app') {
      // Held by the browser until they prove the app works — an unproven secret
      // in the database is a half-finished login waiting to lock someone out.
      const secret = await createTwoFactorSecret()
      const setup = await buildAuthenticatorSetup(account.email, secret)
      return NextResponse.json(setup)
    }

    // ── Email: post them a code ──
    if (action === 'send-email') {
      await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})

      const freshCode = generate6DigitCode()
      await prisma.twoFactorOtp.create({
        data: {
          userId: account.id,
          email: account.email,
          codeHash: await hashPassword(freshCode),
          expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
        },
      })

      await sendTwoFactorCode({
        email: account.email,
        name: account.name,
        code: freshCode,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })

      return NextResponse.json({ success: true, sentTo: account.email })
    }

    // ── Set one method up ──
    if (action === 'enable') {
      if (method === 'APP') {
        if (!secretFromClient) {
          return NextResponse.json({ error: 'Start the setup again.' }, { status: 400 })
        }
        if (!(await verifyTwoFactorCode(secretFromClient, code))) {
          return NextResponse.json(
            { error: 'That code didn’t match. Check your app and try the next one.' },
            { status: 400 }
          )
        }
      } else {
        if (!(await codeMatches(account, 'EMAIL', code))) {
          return NextResponse.json(
            { error: 'That code didn’t match. Check your email and try again.' },
            { status: 400 }
          )
        }
        await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})
      }

      // The first method set up becomes the one used at sign-in; adding a
      // second leaves the existing choice alone so nobody's login changes
      // under them without asking.
      const alreadyHadOne = appReady || emailReady

      await prisma.user.update({
        where: { id: account.id },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: alreadyHadOne ? account.twoFactorMethod : method,
          ...(method === 'APP'
            ? { twoFactorSecret: secretFromClient }
            : { twoFactorEmailReady: true }),
        },
      })

      await audit(`Set up ${method === 'APP' ? 'authenticator app' : 'email'} codes`)

      return NextResponse.json({
        success: true,
        enabled: true,
        appReady: method === 'APP' ? true : appReady,
        emailReady: method === 'EMAIL' ? true : emailReady,
        method: alreadyHadOne ? account.twoFactorMethod : method,
      })
    }

    // ── Choose which one is used at sign-in ──
    if (action === 'set-primary') {
      const ready = method === 'APP' ? appReady : emailReady
      if (!ready) {
        return NextResponse.json(
          { error: 'Set that method up first.' },
          { status: 400 }
        )
      }
      if (account.twoFactorMethod === method) {
        return NextResponse.json({ success: true, method })
      }

      await prisma.user.update({
        where: { id: account.id },
        data: { twoFactorMethod: method },
      })
      await audit(`Sign-in codes now come from ${method === 'APP' ? 'the authenticator app' : 'email'}`)

      return NextResponse.json({ success: true, method })
    }

    // ── Take one method away, keeping the other ──
    if (action === 'remove') {
      const ready = method === 'APP' ? appReady : emailReady
      if (!ready) {
        return NextResponse.json({ error: 'That method isn’t set up.' }, { status: 400 })
      }

      const otherReady = method === 'APP' ? emailReady : appReady
      if (!otherReady && isAdmin) {
        return NextResponse.json(
          {
            error:
              'This is your only second step. Administrators need one — set the other one up first.',
          },
          { status: 400 }
        )
      }

      // Prove it's really them, using whatever is still working
      if (!(await codeMatches(account, account.twoFactorMethod ?? method, code))) {
        return NextResponse.json(
          { error: 'That code didn’t match. Nothing was changed.' },
          { status: 400 }
        )
      }
      await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})

      const nextMethod: Method | null = otherReady ? (method === 'APP' ? 'EMAIL' : 'APP') : null

      await prisma.user.update({
        where: { id: account.id },
        data: {
          twoFactorEnabled: otherReady,
          twoFactorMethod: nextMethod,
          ...(method === 'APP'
            ? { twoFactorSecret: null }
            : { twoFactorEmailReady: false }),
        },
      })

      await audit(`Removed ${method === 'APP' ? 'authenticator app' : 'email'} codes`)

      return NextResponse.json({
        success: true,
        enabled: otherReady,
        appReady: method === 'APP' ? false : appReady,
        emailReady: method === 'EMAIL' ? false : emailReady,
        method: nextMethod,
      })
    }

    // ── Switch everything off ──
    if (action === 'disable') {
      if (!account.twoFactorEnabled) {
        return NextResponse.json({ error: 'Two-factor is already off.' }, { status: 400 })
      }
      if (isAdmin) {
        return NextResponse.json(
          { error: 'Administrator accounts have to keep two-factor on.' },
          { status: 400 }
        )
      }
      if (!(await codeMatches(account, account.twoFactorMethod ?? 'APP', code))) {
        return NextResponse.json(
          { error: 'That code didn’t match. Two-factor is still on.' },
          { status: 400 }
        )
      }

      await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})
      await prisma.user.update({
        where: { id: account.id },
        data: {
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorSecret: null,
          twoFactorEmailReady: false,
        },
      })

      await audit('Turned two-factor off')

      return NextResponse.json({
        success: true,
        enabled: false,
        appReady: false,
        emailReady: false,
        method: null,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
