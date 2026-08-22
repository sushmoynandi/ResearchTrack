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
 * Two-factor verification, open to every signed-in account. Each person picks
 * how the code reaches them:
 *
 *   APP   — an authenticator app, from a QR code
 *   EMAIL — a 6-digit code sent to their address
 *
 * A password on its own is one leak away from someone else reading — or
 * changing — this person's work, so everyone gets the second step.
 */

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000

async function signedInOrNull() {
  try {
    return await requireUser()
  } catch {
    return null
  }
}

/** GET — what's set up right now. */
export async function GET() {
  const me = await signedInOrNull()
  if (!me) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 403 })
  }

  const account = await prisma.user.findUnique({
    where: { id: me.id },
    select: { twoFactorEnabled: true, twoFactorMethod: true, twoFactorSetupDone: true, email: true },
  })

  return NextResponse.json({
    enabled: Boolean(account?.twoFactorEnabled),
    method: account?.twoFactorMethod ?? null,
    setupDone: Boolean(account?.twoFactorSetupDone),
    email: account?.email ?? null,
  })
}

/**
 * POST — one endpoint, several steps chosen with `action`:
 *   start-app    → make a secret and hand back a QR (nothing saved yet)
 *   send-email   → post a code to their address so they can prove it arrives
 *   enable       → check the code, switch it on with the chosen method
 *   disable      → check the code, switch it off
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
    const method = body.method === 'EMAIL' ? 'EMAIL' : 'APP'
    const secretFromClient = typeof body.secret === 'string' ? body.secret : ''

    const account = await prisma.user.findUnique({ where: { id: me.id } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

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

    // ── Switch it on ──
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

        await prisma.user.update({
          where: { id: account.id },
          data: {
            twoFactorEnabled: true,
            twoFactorMethod: 'APP',
            twoFactorSecret: secretFromClient,
            twoFactorSetupDone: true,
          },
        })
      } else {
        const otp = await prisma.twoFactorOtp.findFirst({
          where: { userId: account.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
        if (!otp || !(await verifyPassword(code, otp.codeHash))) {
          return NextResponse.json(
            { error: 'That code didn’t match. Check your email and try again.' },
            { status: 400 }
          )
        }

        await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})
        await prisma.user.update({
          where: { id: account.id },
          data: {
            twoFactorEnabled: true,
            twoFactorMethod: 'EMAIL',
            twoFactorSecret: null,
            twoFactorSetupDone: true,
          },
        })
      }

      await prisma.auditLog.create({
        data: {
          userId: account.id,
          userName: account.name,
          action: 'TWO_FACTOR_ENABLED',
          resource: `user:${account.id}`,
          details: `Two-factor turned on (${method === 'APP' ? 'authenticator app' : 'email'})`,
          severity: 'INFO',
        },
      })

      return NextResponse.json({ success: true, enabled: true, method })
    }

    // ── Switch it off ──
    if (action === 'disable') {
      if (!account.twoFactorEnabled) {
        return NextResponse.json({ error: 'Two-factor is already off.' }, { status: 400 })
      }

      // A code is required, so someone at an unlocked screen can't quietly
      // remove the protection.
      let ok = false
      if (account.twoFactorMethod === 'APP' && account.twoFactorSecret) {
        ok = await verifyTwoFactorCode(account.twoFactorSecret, code)
      } else {
        const otp = await prisma.twoFactorOtp.findFirst({
          where: { userId: account.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
        ok = Boolean(otp && (await verifyPassword(code, otp.codeHash)))
      }

      if (!ok) {
        return NextResponse.json(
          { error: 'That code didn’t match. Two-factor is still on.' },
          { status: 400 }
        )
      }

      await prisma.twoFactorOtp.deleteMany({ where: { userId: account.id } }).catch(() => {})
      await prisma.user.update({
        where: { id: account.id },
        data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null },
      })

      await prisma.auditLog.create({
        data: {
          userId: account.id,
          userName: account.name,
          action: 'TWO_FACTOR_DISABLED',
          resource: `user:${account.id}`,
          details: 'Two-factor turned off',
          severity: 'WARNING',
        },
      })

      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Two-factor error:', error)
    return NextResponse.json({ error: 'Could not update two-factor' }, { status: 500 })
  }
}
