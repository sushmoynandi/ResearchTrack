'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  X,
  Mail,
} from 'lucide-react'

interface SetupData {
  qrDataUrl: string
  secret: string
  uri: string
}

type Method = 'APP' | 'EMAIL'

/**
 * Authenticator-app two-factor, for administrators. Shown on the Profile page.
 * An admin account can hand out roles and read everyone's work, so when this is
 * off the card says so plainly rather than sitting there quietly.
 */
export function TwoFactorCard() {
  const { addToast } = useToast()

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [activeMethod, setActiveMethod] = useState<Method | null>(null)
  const [email, setEmail] = useState('')
  const [choosing, setChoosing] = useState<Method | null>(null)
  const [sentTo, setSentTo] = useState('')
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [disarming, setDisarming] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/2fa')
      if (res.ok) {
        const data = await res.json()
        setEnabled(Boolean(data.enabled))
        setActiveMethod(data.method ?? null)
        setEmail(data.email || '')
      }
    } catch {
      // leave it unknown; the card simply won't render
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const choose = async (picked: Method) => {
    setBusy(true)
    setCode('')
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: picked === 'APP' ? 'start-app' : 'send-email' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start the setup')

      if (picked === 'APP') setSetup(data)
      else setSentTo(data.sentTo || email)
      // While turning it off we only wanted the code sent, not the setup panel
      if (!disarming) setChoosing(picked)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  const cancelChoosing = () => {
    setChoosing(null)
    setSetup(null)
    setSentTo('')
    setCode('')
  }

  const submit = async (action: 'enable' | 'disable') => {
    setBusy(true)
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          code,
          method: choosing ?? activeMethod,
          secret: setup?.secret,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setEnabled(data.enabled)
        setActiveMethod(data.enabled ? (data.method ?? choosing) : null)
        setChoosing(null)
        setSetup(null)
        setSentTo('')
        setCode('')
        setDisarming(false)
        addToast(
          'success',
          action === 'enable'
            ? 'Two-factor is on — you’ll need your app to sign in'
            : 'Two-factor is off'
        )
      } else {
        addToast('error', data.error || 'That didn’t work')
      }
    } catch {
      addToast('error', 'Network error')
    } finally {
      setBusy(false)
    }
  }

  const copySecret = async () => {
    if (!setup) return
    try {
      await navigator.clipboard.writeText(setup.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('error', 'Couldn’t copy — select the code and copy it by hand')
    }
  }

  // Not an admin (the endpoint refuses), or still checking
  if (enabled === null) return null

  return (
    <div className={`glass-card p-6 space-y-5 ${enabled ? '' : 'border-warning/40'}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck size={18} className="text-success" />
          ) : (
            <ShieldAlert size={18} className="text-warning" />
          )}
          <h3 className="text-base font-semibold text-text-primary font-display">
            Two-Factor Authentication
          </h3>
        </div>
        <Badge variant={enabled ? 'success' : 'warning'} size="sm">
          {enabled ? (activeMethod === 'EMAIL' ? 'On · Email' : 'On · App') : 'Off'}
        </Badge>
      </div>

      {/* ── Off: say why that matters ── */}
      {!enabled && !choosing && (
        <>
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning-subtle border border-warning/30">
            <ShieldAlert size={15} className="text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-warning">
                Your administrator account is protected by a password alone
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                This account can change people&apos;s roles, read every paper and note,
                and delete accounts. If the password ever leaks, that is all someone
                needs. With two-factor on, they would also need the phone in your
                pocket.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              onClick={() => choose('APP')}
              loading={busy}
              icon={<Smartphone size={15} />}
            >
              Use an app
            </Button>
            <Button
              variant="secondary"
              onClick={() => choose('EMAIL')}
              loading={busy}
              icon={<Mail size={15} />}
            >
              Email me codes
            </Button>
          </div>
        </>
      )}

      {/* ── Setting up: prove the chosen method works ── */}
      {choosing && (
        <div className="space-y-4">
          {choosing === 'EMAIL' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-subtle border border-accent/25">
              <Mail size={15} className="text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                A 6-digit code is on its way to{' '}
                <span className="text-text-primary font-medium">{sentTo}</span>. It expires
                in 10 minutes.
              </p>
            </div>
          )}

          {choosing === 'APP' && setup && (
            <>
          <p className="text-xs text-text-secondary leading-relaxed">
            Scan this with Google Authenticator, Microsoft Authenticator, Authy or
            1Password, then type the 6-digit code it shows.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="bg-white p-2 rounded-xl shrink-0">
              <Image
                src={setup.qrDataUrl}
                alt="Two-factor QR code"
                width={180}
                height={180}
                unoptimized
              />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <p className="text-[11px] text-text-tertiary">
                Can&apos;t scan? Type this key into your app instead:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-text-primary bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-1.5 break-all">
                  {setup.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  title="Copy"
                  aria-label="Copy the setup key"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-bg-tertiary transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
            </>
          )}

          <Input
            label="6-Digit Code"
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            icon={<KeyRound size={15} />}
            className="tracking-[0.4em] font-mono"
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" onClick={cancelChoosing} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => submit('enable')}
              loading={busy}
              disabled={code.length !== 6}
              icon={<ShieldCheck size={15} />}
            >
              Turn On
            </Button>
          </div>
        </div>
      )}

      {/* ── On ── */}
      {enabled && !choosing && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-success-subtle border border-success/25">
            <ShieldCheck size={15} className="text-success shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {activeMethod === 'EMAIL'
                ? `Signing in sends a 6-digit code to ${email}.`
                : 'Signing in asks for a code from your authenticator app. Keep the app — without it you can’t get in, and there are no backup codes yet.'}
            </p>
          </div>

          {disarming ? (
            <div className="space-y-3">
              {activeMethod === 'EMAIL' && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-text-secondary">
                  <span>{sentTo ? `Code sent to ${sentTo}` : 'Send yourself a code first'}</span>
                  <button
                    type="button"
                    onClick={() => choose('EMAIL')}
                    disabled={busy}
                    className="text-accent hover:text-accent-hover font-medium cursor-pointer disabled:opacity-60"
                  >
                    {sentTo ? 'Send again' : 'Send code'}
                  </button>
                </div>
              )}
              <Input
                label="Enter a code to turn it off"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                icon={<KeyRound size={15} />}
                className="tracking-[0.4em] font-mono"
              />
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDisarming(false)
                    setCode('')
                  }}
                  disabled={busy}
                >
                  Keep it on
                </Button>
                <Button
                  variant="danger"
                  onClick={() => submit('disable')}
                  loading={busy}
                  disabled={code.length !== 6}
                  icon={<X size={15} />}
                >
                  Turn Off
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setDisarming(true)}>
              Turn off two-factor
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
