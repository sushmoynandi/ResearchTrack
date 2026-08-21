'use client'

import React from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordToggleProps {
  /** Whether the password is currently readable. */
  visible: boolean
  onToggle: () => void
  /** Used for the screen-reader label, e.g. "confirm password". */
  label?: string
}

/**
 * The small eye button that sits inside a password box and flips it between
 * dots and plain text. Pass it to <Input trailing={...} />.
 */
export function PasswordToggle({ visible, onToggle, label = 'password' }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      title={visible ? 'Hide' : 'Show'}
      className="p-1.5 rounded-md text-text-tertiary transition-colors duration-200 hover:text-accent hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}
