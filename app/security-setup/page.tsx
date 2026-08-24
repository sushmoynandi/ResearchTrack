'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Atom,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'

type Method = 'APP' | 'EMAIL'

interface SetupData {
  qrDataUrl: string
  secret: string
  uri: string
}

function SetupLoading() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 shadow-glow animate-spin-slow">
          <Atom size={26} />
        </div>
        <p className="text-xs text-text-secondary">Loading ResearchTrack...</p>
      </div>
    </div>
  )
}

/**
 * The step an administrator is held at whenever their account has no second
 * sign-in step configured — on a first sign-in, and again if they ever remove
 * the last one. Nothing else in the app opens up until one is in place.
 */
function SecuritySetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const { user, sessionChecked, refreshUser } = useAuth()

  const [method, setMethod] = useState<Method | null>(null)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Method | null>(null)
  const [copied, setCopied] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const redirectTarget = searchParams.get('redirect') || '/admin/users'

  useEffect(() => {
    if (sessionChecked && !user) router.replace('/login')
    if (sessionChecked && user && user.systemRole !== 'ADMIN') router.replace('/')
  }, [sessionChecked, user, router])

  const choose = async (picked: Method) => {
    // Only the method that was pressed reacts — a shared flag used to light up
    // both cards at once and made it look like two things had been clicked.
    if (pending) return
    setPending(picked)
    setCode('')
    try {
      if (picked === 'APP') {
        const res = await fetch('/api/user/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start-app' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not start the setup')
        setSetup(data)
      } else {
        const res = await fetch('/api/user/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send-email' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not send the code')
        setSentTo(data.sentTo || user?.email || '')
      }
      setMethod(picked)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(null)
    }
  }

  const finish = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable', method, code, secret: setup?.secret }),
      })
      const data = await res.json()

      if (res.ok) {
        addToast('success', 'Two-factor is on. Your account is protected.')
        await refreshUser()
        router.replace(redirectTarget)
        return
      }

      addToast('error', data.error || 'That code didn’t match')
      setBusy(false)
    } catch {
      addToast('error', 'Network error')
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
      addToast('error', 'Couldn’t copy — select the key and copy it by hand')
    }
  }

  if (!user) return <SetupLoading />

  const firstName = user.name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(36rem 28rem at 50% 18%, var(--auth-glow-a), transparent 68%)',
        }}
      />

      <div className="w-full max-w-lg relative z-10 py-8">
        <div className="text-center mb-8">
          <div
            style={{ animationDelay: '40ms' }}
            className="auth-pop inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 mb-3 shadow-glow"
          >
            <ShieldCheck size={24} />
          </div>
          <h1
            style={{ animationDelay: '140ms' }}
            className="auth-rise text-2xl font-bold text-text-primary font-display tracking-tight"
          >
            Secure your account, {firstName}
          </h1>
          <p
            style={{ animationDelay: '200ms' }}
            className="auth-rise text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed"
          >
            You&apos;re an administrator — this account can change people&apos;s roles
            and read everyone&apos;s work, so a password on its own isn&apos;t enough.
            Pick how you&apos;d like to receive a code when you sign in.
          </p>
        </div>

        <div
          style={{ animationDelay: '280ms' }}
          className="auth-rise glass-card p-6 sm:p-8 space-y-6"
        >
          {/* ── Step 1: pick a method ── */}
          {!method && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => choose('APP')}
                disabled={pending !== null}
                aria-busy={pending === 'APP'}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  pending === 'APP'
                    ? 'border-accent bg-accent-subtle/40'
                    : 'border-border-default bg-bg-secondary/60 hover:border-accent hover:bg-bg-tertiary/60'
                } ${pending === 'EMAIL' ? 'opacity-40' : ''} ${
                  pending === null ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center shrink-0">
                    {pending === 'APP' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Smartphone size={18} />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                      Authenticator app
                      <span className="ml-2 text-[10px] font-bold text-success uppercase tracking-wide">
                        Recommended
                      </span>
                    </p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Scan a QR code with Google Authenticator, Authy or 1Password. Codes
                      work even with no signal, and nothing has to reach your inbox.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => choose('EMAIL')}
                disabled={pending !== null}
                aria-busy={pending === 'EMAIL'}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  pending === 'EMAIL'
                    ? 'border-accent bg-accent-subtle/40'
                    : 'border-border-default bg-bg-secondary/60 hover:border-accent hover:bg-bg-tertiary/60'
                } ${pending === 'APP' ? 'opacity-40' : ''} ${
                  pending === null ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-default text-accent flex items-center justify-center shrink-0">
                    {pending === 'EMAIL' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Mail size={18} />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                      Email me a code
                    </p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      A 6-digit code goes to{' '}
                      <span className="text-text-primary">{user.email}</span> each time you
                      sign in. Nothing to install.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ── Step 2: prove it works ── */}
          {method && (
            <form onSubmit={finish} className="space-y-4">
              {method === 'APP' && setup && (
                <>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Scan this with your authenticator app, then type the 6-digit code it
                    shows.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl shrink-0 mx-auto sm:mx-0">
                      <Image
                        src={setup.qrDataUrl}
                        alt="Two-factor QR code"
                        width={170}
                        height={170}
                        unoptimized
                      />
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <p className="text-[11px] text-text-tertiary">
                        Can&apos;t scan? Type this key in instead:
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
                          {copied ? (
                            <Check size={14} className="text-success" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {method === 'EMAIL' && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-subtle border border-accent/25">
                  <Mail size={15} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    A 6-digit code is on its way to{' '}
                    <span className="text-text-primary font-medium">{sentTo}</span>. It
                    expires in 10 minutes.
                  </p>
                </div>
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
                autoFocus
              />

              <Button
                type="submit"
                loading={busy}
                disabled={code.length !== 6}
                className="w-full h-11"
                icon={<ArrowRight size={15} />}
              >
                Turn On &amp; Continue
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMethod(null)
                  setSetup(null)
                  setCode('')
                }}
                disabled={busy}
                className="w-full text-[11px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Choose a different way
              </button>
            </form>
          )}

          <p className="pt-4 border-t border-border-default text-center text-[11px] text-text-tertiary leading-relaxed">
            Set up the other one too, or swap between them, from your Profile page.
            Administrator accounts keep two-factor on, so this screen comes back if
            it is ever removed.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SecuritySetupPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SecuritySetupForm />
    </Suspense>
  )
}
