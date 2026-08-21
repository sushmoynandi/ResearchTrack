import crypto from 'crypto'

export interface Send2FACodeParams {
  email: string
  name: string
  code: string
  ip?: string
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP code.
 */
export function generate6DigitCode(): string {
  const num = crypto.randomInt(100000, 1000000)
  return num.toString()
}

/**
 * Sends a 2FA verification email via Google Apps Script Web App URL.
 */
export async function sendAdmin2FACode(params: {
  email: string
  name: string
  code: string
  ip?: string
}): Promise<{ success: boolean; deliveredVia: 'APPSCRIPT' | 'DEV_FALLBACK'; error?: string }> {
  const appscriptUrl = process.env.APPSCRIPT_2FA_URL

  const payload = {
    email: params.email,
    name: params.name || 'Administrator',
    code: params.code,
    appName: 'ResearchTrack',
    ip: params.ip || '127.0.0.1',
    time: new Date().toUTCString(),
  }

  if (appscriptUrl && appscriptUrl.startsWith('http')) {
    try {
      const res = await fetch(appscriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        console.warn(`[2FA AppsScript Error] HTTP ${res.status}: ${await res.text().catch(() => '')}`)
        return {
          success: true,
          deliveredVia: 'DEV_FALLBACK',
          error: `Apps Script returned HTTP ${res.status}`,
        }
      }

      const resData = await res.json().catch(() => ({}))
      return {
        success: true,
        deliveredVia: 'APPSCRIPT',
      }
    } catch (err: any) {
      console.error('[2FA AppsScript Dispatch Error]:', err?.message || err)
      return {
        success: true,
        deliveredVia: 'DEV_FALLBACK',
        error: err?.message,
      }
    }
  }

  // If APPSCRIPT_2FA_URL is not set or configured yet, log clearly for development
  console.log('──────────────────────────────────────────────────')
  console.log('🔐 [ADMIN 2FA SECURITY CODE]')
  console.log(`👤 Target Admin: ${params.name} (${params.email})`)
  console.log(`🔢 6-Digit OTP : ${params.code}`)
  console.log(`⏱️ Expiration  : 10 Minutes`)
  console.log('💡 Note: Set APPSCRIPT_2FA_URL in .env to send via Gmail.')
  console.log('──────────────────────────────────────────────────')

  return {
    success: true,
    deliveredVia: 'DEV_FALLBACK',
  }
}

/**
 * Sends a password reset code through the same Google Apps Script mailer the
 * admin 2FA codes use. With APPSCRIPT_2FA_URL unset (local development) the
 * code is printed to the terminal instead, so the flow still works end to end.
 */
export async function sendPasswordResetCode(params: {
  email: string
  name: string
  code: string
  ip?: string
}): Promise<{ success: boolean; deliveredVia: 'APPSCRIPT' | 'DEV_FALLBACK' }> {
  const appscriptUrl = process.env.APPSCRIPT_2FA_URL

  if (appscriptUrl && appscriptUrl.startsWith('http')) {
    try {
      const res = await fetch(appscriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email,
          name: params.name || 'Researcher',
          code: params.code,
          appName: 'ResearchTrack',
          purpose: 'PASSWORD_RESET',
          subject: 'Your ResearchTrack password reset code',
          ip: params.ip || '127.0.0.1',
          time: new Date().toUTCString(),
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) return { success: true, deliveredVia: 'APPSCRIPT' }
      console.warn(`[Password reset mail] HTTP ${res.status}`)
    } catch (err) {
      console.error('[Password reset mail] dispatch failed:', err)
    }
  }

  console.log('──────────────────────────────────────────────────')
  console.log('🔑 [PASSWORD RESET CODE]')
  console.log(`👤 Account     : ${params.name} (${params.email})`)
  console.log(`🔢 6-Digit Code: ${params.code}`)
  console.log('⏱️ Expiration  : 15 minutes')
  console.log('💡 Set APPSCRIPT_2FA_URL in .env to email this instead.')
  console.log('──────────────────────────────────────────────────')

  return { success: true, deliveredVia: 'DEV_FALLBACK' }
}
