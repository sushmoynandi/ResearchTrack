'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import {
  User as UserIcon,
  LogOut,
  Settings,
  Sparkles,
  ChevronDown,
  Building,
  ShieldAlert,
} from 'lucide-react'

export function UserMenu() {
  const { user, logout, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-bg-tertiary animate-pulse" />
    )
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 text-xs font-medium text-text-primary bg-bg-tertiary hover:bg-bg-elevated border border-border-default rounded-lg transition-colors"
      >
        Sign In
      </Link>
    )
  }

  // Generate initials
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-bg-tertiary transition-all cursor-pointer group"
        aria-label="User profile menu"
      >
        {/* Avatar / Initials */}
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 text-accent font-semibold text-xs flex items-center justify-center transition-transform group-hover:scale-105">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* User Info desktop teaser */}
        <div className="hidden lg:flex flex-col text-left">
          <span className="text-xs font-semibold text-text-primary leading-none group-hover:text-accent transition-colors truncate max-w-[110px]">
            {user.name}
          </span>
          <span className="text-[10px] text-text-tertiary leading-tight truncate max-w-[110px]">
            {user.isGuest ? 'Guest Sandbox' : (user.institution || 'Researcher')}
          </span>
        </div>

        <ChevronDown size={14} className="text-text-tertiary group-hover:text-text-primary transition-transform duration-200" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-bg-secondary border border-border-default shadow-modal p-2 z-50 animate-scale-in">
          {/* Header Card in Dropdown */}
          <div className="p-3 bg-bg-tertiary/70 rounded-lg border border-border-default/60 mb-2">
            <p className="text-sm font-bold text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-tertiary truncate">{user.email}</p>

            {user.institution && (
              <div className="flex items-center gap-1 text-[11px] text-text-secondary mt-1.5">
                <Building size={11} className="text-accent shrink-0" />
                <span className="truncate">{user.institution}</span>
              </div>
            )}

            {user.isGuest && (
              <div className="mt-2.5 p-2 rounded bg-warning-subtle/80 border border-warning/30 text-[11px] text-warning flex items-center gap-1.5">
                <ShieldAlert size={12} className="shrink-0" />
                <span>Temporary Guest Session</span>
              </div>
            )}
          </div>

          {/* Action Links */}
          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <UserIcon size={14} className="text-accent" />
              <span>Researcher Profile &amp; Settings</span>
            </Link>

            {user.isGuest && (
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-accent hover:bg-accent-subtle rounded-lg transition-colors font-medium"
              >
                <Sparkles size={14} />
                <span>Save Library (Register Account)</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-danger hover:bg-danger-subtle rounded-lg transition-colors cursor-pointer text-left"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
