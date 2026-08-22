import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

const ISSUER = 'ResearchTrack'

/** A fresh authenticator secret. Only stored once the person proves it works. */
export async function createTwoFactorSecret(): Promise<string> {
  return generateSecret()
}

/**
 * The `otpauth://` address an authenticator app understands, plus a QR image of
 * it as a data URL so the page can show it without fetching anything.
 */
export async function buildAuthenticatorSetup(email: string, secret: string) {
  const uri = String(await generateURI({ secret, label: email, issuer: ISSUER }))
  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 240,
    margin: 1,
    color: { dark: '#0f1720', light: '#ffffff' },
  })
  return { uri, qrDataUrl, secret }
}

/**
 * Check a 6-digit code against the secret. `epochTolerance` gives 30 seconds of
 * slack either side, so a phone clock that drifts a little still works.
 */
export async function verifyTwoFactorCode(secret: string, token: string): Promise<boolean> {
  const clean = token.replace(/\D/g, '')
  if (clean.length !== 6) return false

  try {
    const result = await verify({ secret, token: clean, epochTolerance: 30 })
    return Boolean(typeof result === 'object' ? result.valid : result)
  } catch {
    return false
  }
}
