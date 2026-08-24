'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Calendar,
  CalendarPlus,
  Download,
  ExternalLink,
  ChevronDown,
  Check,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  generateIcsContent,
  downloadIcsFile,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  CalendarEventParams,
} from '@/lib/calendarSync'

interface CalendarSyncButtonProps {
  event: CalendarEventParams
  filename?: string
  buttonText?: string
  size?: 'xs' | 'sm' | 'md'
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
}

export function CalendarSyncButton({
  event,
  filename = 'research-event',
  buttonText = 'Add to Calendar',
  size = 'sm',
  variant = 'secondary',
}: CalendarSyncButtonProps) {
  const { addToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent(event)
      downloadIcsFile(filename, ics)
      addToast('success', 'iCal (.ics) file downloaded for Apple Calendar & Outlook!')
      setIsOpen(false)
    } catch {
      addToast('error', 'Failed to generate iCal file')
    }
  }

  const handleGoogleCalendar = () => {
    const url = getGoogleCalendarUrl(event)
    window.open(url, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  const handleOutlookCalendar = () => {
    const url = getOutlookCalendarUrl(event)
    window.open(url, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        size={size}
        variant={variant as any}
        onClick={() => setIsOpen(!isOpen)}
        icon={<CalendarPlus size={14} className="text-accent" />}
      >
        <span>{buttonText}</span>
        <ChevronDown size={12} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-bg-secondary/95 backdrop-blur-md border border-border-default shadow-2xl p-1.5 z-50 text-xs animate-scale-in space-y-1">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider border-b border-border-default/60">
            Sync Calendar Event
          </div>

          <button
            type="button"
            onClick={handleGoogleCalendar}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-bg-tertiary text-text-primary transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span className="font-semibold">Google Calendar</span>
            </div>
            <ExternalLink size={12} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-bg-tertiary text-text-primary transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🍎</span>
              <div>
                <span className="font-semibold block">Apple Calendar / iCal</span>
                <span className="text-[10px] text-text-tertiary font-mono">.ics Download</span>
              </div>
            </div>
            <Download size={12} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            onClick={handleOutlookCalendar}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-bg-tertiary text-text-primary transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📧</span>
              <span className="font-semibold">Outlook Live</span>
            </div>
            <ExternalLink size={12} className="text-text-tertiary" />
          </button>
        </div>
      )}
    </div>
  )
}
