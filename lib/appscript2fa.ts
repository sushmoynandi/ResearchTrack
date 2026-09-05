import {
  generate6DigitCode,
  isMailerConfigured,
  sendTwoFactorOtpEmail,
  sendPasswordResetOtpEmail,
} from './email'

export { generate6DigitCode, isMailerConfigured }

export interface Send2FACodeParams {
  email: string
  name: string
  code: string
  ip?: string
}

/**
 * Sends a 2FA verification email directly via SMTP (Nodemailer).
 */
export async function sendTwoFactorCode(params: {
  email: string
  name: string
  code: string
  ip?: string
}): Promise<{ success: boolean; deliveredVia: 'SMTP' | 'DEV_FALLBACK'; error?: string }> {
  try {
    const success = await sendTwoFactorOtpEmail({
      toEmail: params.email,
      recipientName: params.name,
      code: params.code,
      ip: params.ip,
    })

    const hasSmtpCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

    return {
      success,
      deliveredVia: hasSmtpCredentials ? 'SMTP' : 'DEV_FALLBACK',
    }
  } catch (err: any) {
    console.error('[2FA SMTP Dispatch Error]:', err?.message || err)
    return {
      success: false,
      deliveredVia: 'DEV_FALLBACK',
      error: err?.message || 'SMTP dispatch error',
    }
  }
}

/**
 * Sends a password reset code directly via SMTP (Nodemailer).
 */
export async function sendPasswordResetCode(params: {
  email: string
  name: string
  code: string
  ip?: string
}): Promise<{ delivered: boolean }> {
  try {
    const delivered = await sendPasswordResetOtpEmail({
      toEmail: params.email,
      recipientName: params.name,
      code: params.code,
      ip: params.ip,
    })

    return { delivered }
  } catch (err) {
    console.error('[Password reset mail] SMTP dispatch failed:', err)
    return { delivered: false }
  }
}

