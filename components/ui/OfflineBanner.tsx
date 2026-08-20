'use client'

import React, { useState, useEffect } from 'react'
import { WifiOff, Wifi, Sparkles } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js?v=2.1.0').catch((err) => {
        console.warn('Service worker registration failed:', err)
      })
    }

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-md text-amber-300 shadow-2xl flex items-center gap-3 animate-slide-in">
      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
        <WifiOff size={16} />
      </div>
      <div className="text-xs space-y-0.5">
        <p className="font-bold text-amber-200">Offline Reading Mode Active</p>
        <p className="text-[11px] opacity-80">
          Showing cached research literature and notes. Changes will sync when reconnected.
        </p>
      </div>
    </div>
  )
}
