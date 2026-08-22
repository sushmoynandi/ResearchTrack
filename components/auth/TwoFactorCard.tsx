'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  Mail,
  Loader2,
  Trash2,
  CircleCheck,
  Circle,
} from 'lucide-react'

interface SetupData {
  qrDataUrl: string
  secret: string
  uri: string
}

type Method = 'APP' | 'EMAIL'

interface Status {
  enabled: boolean
  method: Method | null
  appReady: boolean
  emailReady: boolean
  email: string
  mustKeepOne: boolean
}

const LABEL: Record<Method, string> = {
  APP: 'Authenticator app',
  EMAIL: 'Email codes',
}

const BLURB: Record<Method, string> = {
  APP: 'A code from Google Authenticator, Authy or 1Password. Works with no signal.',
  EMAIL: 'A 6-digit code sent to your inbox each time you sign in.',
}

/**
 * Two-factor verification for any account, shown on the Profile page.
 *
 * Both methods can be set up side by side; one of them is marked as the one
 * used at sign-in. Administrators must keep at least one — the gate in
 * proxy.ts sends them back to /security-setup the moment they have none, so
 * the controls that would leave them with nothing are hidden rather than
 * offered and refused.
 */
export function TwoFactorCard() {
  const { addToast } = useToast()
  const { user, refreshUser } = useAuth()
  const isAdmin = user?.systemRole === 'ADMIN'

  const [status, setStatus] = useState<Status | null>(null)
  const [setting, setSetting] = useState<Method | null>(null)
  const [removing, setRemoving] = useState<Method | null>(null)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState<Method | null>(null)
  const [switching, setSwitching] = useState<Method | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/2fa')
      if (res.ok) setStatus(await res.json())
    } catch {
      // leave it unknown; the card simply won't render
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closePanel = () => {
    setSetting(null)
    setRemoving(null)
    setSetup(null)
    setSentTo('')
    setCode('')
  }

  /** Begin setting one method up: fetch a QR, or post a code. */
  const beginSetup = async (picked: Method) => {
    if (pending) return
    setPending(picked)
    setCode('')
    setSetup(null)
    setSentTo('')
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: picked === 'APP' ? 'start-app' : 'send-email' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start the setup')

      if (picked === 'APP') setSetup(data)
      else setSentTo(data.sentTo || status?.email || '')
      setRemoving(null)
      setSetting(picked)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Network error')
    } finally {
      setPending(null)
    }
  }

  /** Begin removing one: an emailed code has to be sent first. */
  const beginRemove = async (target: Method) => {
    setSetting(null)
    setSetup(null)
    setCode('')
    setRemoving(target)

    if (status?.method === 'EMAIL') {
      setPending('EMAIL')
      try {
        const res = await fetch('/api/user/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send-email' }),
        })
        const data = await res.json()
        if (res.ok) setSentTo(data.sentTo || status?.email || '')
      } catch {
        // the panel offers a "Send again" link
      } finally {
        setPending(null)
      }
    }
  }

  /** Which method a code should come from right now. */
  const codeSource: Method = removing ? (status?.method ?? removing) : (setting ?? 'APP')

  const submit = async () => {
    setBusy(true)
    try {
      const removingNow = removing
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          removingNow
            ? { action: 'remove', method: removingNow, code }
            : { action: 'enable', method: setting, code, secret: setup?.secret }
        ),
      })
      const data = await res.json()

      if (!res.ok) {
        addToast('error', data.error || 'That didn’t work')
        return
      }

      closePanel()
      await load()
      // The gate reads two-factor off the session cookie, so refresh it before
      // the next navigation decides whether to let this person through
      await refreshUser()
      addToast(
        'success',
        removingNow
          ? `${LABEL[removingNow]} removed`
          : `${LABEL[setting as Method]} is ready`
      )
    } catch {
      addToast('error', 'Network error')
    } finally {
      setBusy(false)
    }
  }

  /** Switch which ready method is used at sign-in. */
  const setPrimary = async (picked: Method) => {
    if (switching || status?.method === picked) return
    setSwitching(picked)
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-primary', method: picked }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not switch')
      setStatus((s) => (s ? { ...s, method: picked } : s))
      addToast('success', `Sign-in will use ${LABEL[picked].toLowerCase()}`)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Network error')
    } finally {
      setSwitching(null)
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

  // Not signed in (the endpoint refuses), or still checking
  if (!status) return null

  const { enabled, method, appReady, emailReady, mustKeepOne } = status
  const readyCount = (appReady ? 1 : 0) + (emailReady ? 1 : 0)
  const panelOpen = setting !== null || removing !== null

  const isReady = (m: Method) => (m === 'APP' ? appReady : emailReady)

  return (
    <div className={`glass-card p-6 space-y-5 ${enabled ? '' : 'border-warning/40'}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck size={18} className="text-success" />
          ) : (
            <ShieldAlert size={18} className="text-warning" />
          )}
          <h3 className="font-display text-base font-semibold text-text-primary">
            Two-Factor Authentication
          </h3>
        </div>
        <Badge variant={enabled ? 'success' : 'warning'} size="sm">
          {enabled ? (readyCount === 2 ? 'On · Both' : `On · ${method === 'EMAIL' ? 'Email' : 'App'}`) : 'Off'}
        </Badge>
      </div>

      {/* ── Nothing set up ── */}
      {!enabled && !panelOpen && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-subtle px-3.5 py-2.5">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-[11px] leading-relaxed text-text-secondary">
            <span className="font-semibold text-warning">Password only. </span>
            {isAdmin
              ? 'This account hands out roles and reads everyone’s work. If the password leaks, that is all someone needs.'
              : 'Your papers, notes and everything you’ve written sit behind that one password.'}
          </p>
        </div>
      )}

      {/* ── The two methods, side by side ── */}
      {!panelOpen && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {enabled ? 'Your second steps' : 'Add a second step'}
          </p>

          <div className="space-y-2">
            {(['APP', 'EMAIL'] as Method[]).map((m) => {
              const ready = isReady(m)
              const active = ready && method === m
              const loading = pending === m

              return (
                <div
                  key={m}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    ready
                      ? 'border-border-default bg-bg-secondary/50'
                      : 'border-dashed border-border-default bg-transparent'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      ready
                        ? 'border-success/30 bg-success-subtle text-success'
                        : 'border-border-default bg-bg-tertiary text-text-tertiary'
                    }`}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : m === 'APP' ? (
                      <Smartphone size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-text-primary">
                        {LABEL[m]}
                      </span>
                      {active && (
                        <span className="rounded-full bg-accent-subtle px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent">
                          Used at sign-in
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-text-secondary">
                      {ready && m === 'EMAIL' ? `Codes go to ${status.email}.` : BLURB[m]}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {!ready ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => beginSetup(m)}
                        disabled={pending !== null}
                      >
                        Set up
                      </Button>
                    ) : (
                      /* Switching between them lives in the picker below —
                         a second control here would just say it twice */
                      (readyCount > 1 || !mustKeepOne) && (
                        <button
                          type="button"
                          onClick={() => beginRemove(m)}
                          title={`Remove ${LABEL[m].toLowerCase()}`}
                          aria-label={`Remove ${LABEL[m].toLowerCase()}`}
                          className="cursor-pointer rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-danger-subtle hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Which one signs you in — only worth showing once both exist */}
          {readyCount === 2 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-bg-secondary/40 px-3.5 py-2.5">
              <span className="text-[11px] font-medium text-text-secondary">
                Signing in uses:
              </span>
              {(['APP', 'EMAIL'] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrimary(m)}
                  disabled={switching !== null}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
                    method === m
                      ? 'border-accent/40 bg-accent-subtle text-accent'
                      : 'border-border-default text-text-secondary hover:border-accent/40 hover:text-text-primary'
                  }`}
                >
                  {switching === m ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : method === m ? (
                    <CircleCheck size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                  {LABEL[m]}
                </button>
              ))}
            </div>
          )}

          {isAdmin && enabled && (
            <p className="text-[10px] leading-relaxed text-text-tertiary">
              Administrator accounts keep two-factor on — you can swap methods, but
              not remove the last one.
            </p>
          )}
        </div>
      )}

      {/* ── Setting one up, or removing one ── */}
      {panelOpen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-text-primary">
              {removing ? `Remove ${LABEL[removing].toLowerCase()}` : `Set up ${LABEL[setting as Method].toLowerCase()}`}
            </p>
            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className="cursor-pointer text-[11px] text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {setting === 'APP' && setup && (
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="mx-auto shrink-0 rounded-xl bg-white p-2 sm:mx-0">
                <Image
                  src={setup.qrDataUrl}
                  alt="Two-factor QR code"
                  width={170}
                  height={170}
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] leading-relaxed text-text-secondary">
                  Scan this with Google Authenticator, Authy or 1Password, then type
                  the 6-digit code it shows.
                </p>
                <p className="text-[11px] text-text-tertiary">
                  Can&apos;t scan? Type this key in instead:
                </p>
                <div className="flex items-center gap-2">
                  <code className="break-all rounded-lg border border-border-default bg-bg-tertiary px-2.5 py-1.5 font-mono text-[11px] text-text-primary">
                    {setup.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    title="Copy"
                    aria-label="Copy the setup key"
                    className="shrink-0 cursor-pointer rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-accent"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {codeSource === 'EMAIL' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent-subtle px-3 py-2.5">
              <Mail size={14} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] leading-relaxed text-text-secondary">
                  {sentTo ? (
                    <>
                      A 6-digit code is on its way to{' '}
                      <span className="font-medium text-text-primary">{sentTo}</span>. It
                      expires in 10 minutes.
                    </>
                  ) : (
                    'Send yourself a code to carry on.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => beginSetup('EMAIL')}
                  disabled={pending !== null}
                  className="cursor-pointer text-[11px] font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-60"
                >
                  {pending === 'EMAIL' ? 'Sending…' : sentTo ? 'Send again' : 'Send code'}
                </button>
              </div>
            </div>
          )}

          {removing && codeSource === 'APP' && (
            <p className="text-[11px] leading-relaxed text-text-secondary">
              Enter a code from your authenticator app to confirm it&apos;s you.
            </p>
          )}

          <Input
            label="6-Digit Code"
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            icon={<KeyRound size={15} />}
            className="font-mono tracking-[0.4em]"
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant={removing ? 'danger' : 'primary'}
              onClick={submit}
              loading={busy}
              disabled={code.length !== 6}
              icon={removing ? <Trash2 size={15} /> : <ShieldCheck size={15} />}
            >
              {removing ? 'Remove' : 'Turn On'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
