'use client'

import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type ThemePreference } from './ThemeProvider'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

/**
 * Light / Dark / System, as a three-way segmented switch.
 *
 * A segmented switch rather than a single flipping icon, because with three
 * choices a lone icon can never show you where you are — you'd have to click
 * it and watch. Here the current setting is always visible.
 *
 *  - `compact`: icons only, sized for the top bar
 *  - `full`: icons with labels, for a settings panel or a menu
 */
export function ThemeToggle({
  size = 'compact',
  className = '',
}: {
  size?: 'compact' | 'full'
  className?: string
}) {
  const { theme, setTheme } = useTheme()
  const isFull = size === 'full'

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border-default bg-bg-tertiary p-0.5 ${
        isFull ? 'w-full' : ''
      } ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`
              flex items-center justify-center gap-1.5 rounded-md
              text-[11px] font-medium transition-all duration-200 ease-smooth cursor-pointer
              ${isFull ? 'flex-1 h-8 px-2' : 'h-7 w-7'}
              ${
                isActive
                  ? 'bg-bg-secondary text-accent shadow-sm border border-border-default'
                  : 'border border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
              }
            `}
          >
            <Icon size={isFull ? 14 : 13} strokeWidth={2.2} />
            {isFull && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
