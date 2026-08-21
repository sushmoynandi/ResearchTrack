'use client'

import React from 'react'

/**
 * Scores a password 0–4 on length and character variety. Shared so the meter
 * reads the same everywhere it appears.
 */
export function scorePassword(password: string) {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

const levels = [
  { bar: 'bg-danger w-1/4', label: 'Weak password' },
  { bar: 'bg-warning w-1/3', label: 'Weak password' },
  { bar: 'bg-warning w-1/2', label: 'Fair password' },
  { bar: 'bg-info w-3/4', label: 'Good password' },
  { bar: 'bg-success w-full', label: 'Strong password' },
]

interface PasswordStrengthMeterProps {
  password: string
}

/** The thin weak → strong bar shown under a password box. */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const { bar, label } = levels[Math.min(scorePassword(password), levels.length - 1)]

  return (
    <div className="space-y-1 pt-1">
      <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${bar}`} />
      </div>
      <span className="text-[10px] text-text-tertiary">{label}</span>
    </div>
  )
}
