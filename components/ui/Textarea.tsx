'use client'

import React, { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  showCount?: boolean
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showCount, maxLength, className = '', id, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const charCount = typeof value === 'string' ? value.length : 0

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={`
            w-full min-h-[100px] px-3 py-2.5 text-sm rounded-lg resize-y
            bg-bg-tertiary border border-border-default
            text-text-primary placeholder:text-text-tertiary
            transition-all duration-200 ease-smooth
            hover:border-border-hover
            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:ring-danger/40 focus:border-danger' : ''}
            ${className}
          `}
          {...props}
        />
        <div className="flex justify-between">
          {error && <p className="text-xs text-danger">{error}</p>}
          {showCount && maxLength && (
            <p className={`text-xs ml-auto ${charCount > maxLength * 0.9 ? 'text-warning' : 'text-text-tertiary'}`}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
