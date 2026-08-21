'use client'

import React from 'react'
import Link from 'next/link'
import { Atom, Library, LineChart, Users } from 'lucide-react'

interface AuthSplitLayoutProps {
  children: React.ReactNode
  /** Heading shown above the form (e.g. "Sign in"). */
  title: string
  /** Small supporting line under the heading. */
  subtitle?: string
  /**
   * Optional image for the left panel. Drop a file in /public and pass its
   * path, e.g. imageSrc="/auth-hero.jpg". If omitted, a branded gradient
   * panel is shown instead.
   */
  imageSrc?: string
  headline?: string
  subheadline?: string
  /** Tailwind max-width class for the form column (default max-w-sm). */
  contentClassName?: string
}

const features = [
  { icon: Library, text: 'One-click ArXiv & Semantic Scholar paper import' },
  { icon: LineChart, text: 'Benchmarks, model specs & a clear reading pipeline' },
  { icon: Users, text: 'Share papers and reviews with your lab' },
]

export function AuthSplitLayout({
  children,
  title,
  subtitle,
  imageSrc,
  headline,
  subheadline,
  contentClassName = 'max-w-sm',
}: AuthSplitLayoutProps) {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* ─── LEFT: brand / image panel (hidden on mobile) ─── */}
      <aside className="hidden lg:flex lg:w-[62%] relative overflow-hidden">
        {imageSrc ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageSrc})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-bg-primary via-bg-primary/70 to-bg-primary/30" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-primary" />
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
                maskImage: 'radial-gradient(ellipse at 30% 25%, black, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 30% 25%, black, transparent 75%)',
              }}
            />
            <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-accent/20 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-info/20 rounded-full blur-[130px] pointer-events-none" />
          </>
        )}

        {/* Foreground content — one centred column so the gaps never stretch
            out on tall screens */}
        <div className="relative z-10 flex w-full items-center justify-center px-12 xl:px-16 py-12">
          <div className="w-full max-w-2xl xl:max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-2.5 w-fit mb-14">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-subtle text-accent border border-accent/30 shadow-glow">
                <Atom size={22} className="animate-spin-slow" />
              </span>
              <span className="text-lg font-bold font-display text-text-primary tracking-tight">
                ResearchTrack
              </span>
            </Link>

            <div className="space-y-6">
              <h2 className="text-[38px] xl:text-[46px] font-bold font-display text-text-primary leading-[1.1] tracking-[-0.02em] text-balance">
                {headline || 'Your AI research, finally organized.'}
              </h2>
              <p className="text-base text-text-secondary leading-relaxed max-w-xl xl:max-w-2xl">
                {subheadline ||
                  'Track papers, pull ArXiv metadata in one click, and turn scattered reading into a structured literature review.'}
              </p>
              <ul className="space-y-4 pt-5">
                {features.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3.5 text-[15px] text-text-secondary">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-bg-tertiary/70 border border-border-default text-accent shrink-0">
                      <Icon size={15} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-text-tertiary mt-14">
              © {year} ResearchTrack · Built for researchers
            </p>
          </div>
        </div>
      </aside>

      {/* ─── RIGHT: form column (only content shown on mobile) ─── */}
      <main className="relative w-full lg:w-[38%] flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Soft ambient glow, mobile only */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-accent/10 rounded-full blur-[140px] pointer-events-none lg:hidden" />

        <div
          className={`relative z-10 w-full ${contentClassName} mx-auto my-auto px-6 sm:px-8 py-12 animate-fade-in`}
        >
          {/* Compact logo — mobile only (desktop uses the left panel) */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2.5 mb-10">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent-subtle text-accent border border-accent/30 shadow-glow">
              <Atom size={20} className="animate-spin-slow" />
            </span>
            <span className="text-base font-bold font-display text-text-primary tracking-tight">
              ResearchTrack
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-[22px] sm:text-2xl font-bold font-display text-text-primary tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">{subtitle}</p>
            )}
          </div>

          {/* Form body — consistent vertical rhythm across both pages */}
          <div className="space-y-4">{children}</div>
        </div>
      </main>
    </div>
  )
}
