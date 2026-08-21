'use client'

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.705a5.41 5.41 0 0 1-.282-1.705c0-.593.102-1.17.282-1.705V4.963H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

interface GoogleButtonProps {
  /** 'login' or 'register' — only affects the small analytics hint sent to the server. */
  mode?: 'login' | 'register'
  /** Where to land after a successful sign-in (defaults to the dashboard). */
  redirect?: string | null
  /** Button label. */
  label?: string
}

export function GoogleButton({ mode = 'login', redirect, label = 'Continue with Google' }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    const params = new URLSearchParams({ mode })
    if (redirect) params.set('redirect', redirect)
    window.location.href = `/api/auth/google?${params.toString()}`
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg border border-border-default bg-bg-secondary text-text-primary text-sm font-medium transition-all duration-200 hover:bg-bg-tertiary hover:border-border-hover disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? <Loader2 size={16} className="animate-spin text-text-secondary" /> : <GoogleIcon />}
      <span>{loading ? 'Connecting to Google…' : label}</span>
    </button>
  )
}
