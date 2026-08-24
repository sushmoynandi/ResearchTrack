'use client'

import React from 'react'
import Link from 'next/link'
import {
  Atom,
  ArrowRight,
  Building,
  FileText,
  Milestone,
  ClipboardList,
  Calendar,
  Users,
  FolderOpen,
  Tags,
  TrendingUp,
  ShieldCheck,
  Download,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Lock,
  KeyRound,
  LineChart,
} from 'lucide-react'

/* ── Section data ───────────────────────────────────────────
   Kept beside the markup rather than in a separate file — it's
   copy for one page, and reading it next to the layout is the
   whole point. */

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#roles', label: 'Who it’s for' },
  { href: '#how', label: 'How it works' },
  { href: '#security', label: 'Security' },
]

/** The three headline capabilities, shown as the wide tiles of the bento. */
const HERO_PIPELINE = [
  { label: 'To read', count: 12, className: 'status-to-read' },
  { label: 'Reading', count: 5, className: 'status-reading' },
  { label: 'Completed', count: 38, className: 'status-completed' },
]

const HERO_PAPERS = [
  { title: 'Attention Is All You Need', venue: 'NeurIPS', tag: 'Transformers' },
  { title: 'Segment Anything', venue: 'ICCV', tag: 'Vision' },
  { title: 'Direct Preference Optimization', venue: 'NeurIPS', tag: 'Alignment' },
]

const FEATURES = [
  {
    icon: Building,
    title: 'Research labs & sub-groups',
    body:
      'Give every lab its own space — members, sub-groups, shared reading, and a journal club that actually has a schedule.',
  },
  {
    icon: FileText,
    title: 'One-click paper import',
    body:
      'Paste an ArXiv or Semantic Scholar link and the title, authors, abstract, venue and DOI fill themselves in.',
  },
  {
    icon: Milestone,
    title: 'Reading tracks',
    body:
      'Turn a pile of PDFs into an ordered curriculum, so a new student knows exactly what to read in what order.',
  },
  {
    icon: ClipboardList,
    title: 'Assignments',
    body:
      'Supervisors assign papers with a due date. Students see what is pending, what is late, and what is done.',
  },
  {
    icon: Calendar,
    title: '1-on-1 meetings',
    body:
      'Schedule supervisions, keep notes against each one, and stop rebuilding context at the start of every session.',
  },
  {
    icon: GraduationCap,
    title: 'Thesis milestones',
    body:
      'Proposal, literature review, defence — the long arc of a degree tracked in one place instead of a shared doc.',
  },
  {
    icon: FolderOpen,
    title: 'Collections & tags',
    body:
      'Group papers by project or theme with colour-coded collections and a tag taxonomy that stays yours.',
  },
  {
    icon: BarChart3,
    title: 'Contribution analytics',
    body:
      'A per-student activity heatmap and reading-velocity chart, so supervisors can see effort, not just output.',
  },
]

const ROLES = [
  {
    icon: GraduationCap,
    ring: 'role-ring-student',
    dot: 'hsl(210 85% 62%)',
    name: 'Student researcher',
    line: 'Know what to read next.',
    points: [
      'Your assigned papers, sorted by what’s due',
      'Private notes and highlights on every paper',
      'Your own reading streak and progress',
    ],
  },
  {
    icon: Users,
    ring: 'role-ring-supervisor',
    dot: 'hsl(145 62% 48%)',
    name: 'Supervisor',
    line: 'See the whole group at a glance.',
    points: [
      'Assign reading and set due dates',
      'Every student’s progress on one screen',
      'Meetings and milestones in one timeline',
    ],
  },
  {
    icon: ShieldCheck,
    ring: 'role-ring-admin',
    dot: 'hsl(38 92% 58%)',
    name: 'Administrator',
    line: 'Run the department, safely.',
    points: [
      'Approve role changes from one queue',
      'A full audit trail of every change',
      'Two-factor required, not suggested',
    ],
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Create your account',
    body:
      'Email and password, or continue with Google. Then one short screen: your role, institution and department.',
  },
  {
    n: '02',
    title: 'Build your library',
    body:
      'Import papers from ArXiv or Semantic Scholar, sort them into collections, and join or create a research lab.',
  },
  {
    n: '03',
    title: 'Work as a group',
    body:
      'Supervisors assign reading and book meetings. Students read, take notes, and tick milestones off.',
  },
]

const SECURITY = [
  {
    icon: KeyRound,
    title: 'Two-factor, your way',
    body:
      'An authenticator app, emailed codes, or both side by side — with a picker for which one signs you in.',
  },
  {
    icon: Lock,
    title: 'Your data stays yours',
    body:
      'Papers, notes, collections and tags are isolated per account in PostgreSQL. Nothing leaks between labs.',
  },
  {
    icon: ShieldCheck,
    title: 'Every change recorded',
    body:
      'Role changes and security settings are written to an audit trail an administrator can read back.',
  },
]

/* ── Small building blocks ─────────────────────────────────── */

function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
  const icon = size === 'lg' ? 24 : 20
  const text = size === 'lg' ? 'text-xl' : 'text-base'

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${box} inline-flex items-center justify-center rounded-xl bg-accent-subtle text-accent border border-accent/30 shadow-glow`}
      >
        <Atom size={icon} className="animate-spin-slow" />
      </span>
      <span className={`${text} font-bold font-display text-text-primary tracking-tight`}>
        ResearchTrack
      </span>
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
      <span className="w-5 h-px bg-accent/50" />
      {children}
    </span>
  )
}

/* ── Page ──────────────────────────────────────────────────── */

export function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* ─── Navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border-default/70 bg-bg-primary/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="ResearchTrack home">
            <Logo />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary sm:px-4"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-smooth hover:bg-accent-hover sm:px-4"
            >
              Register
              <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="auth-panel absolute inset-0" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-bg-primary" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          {/* Copy */}
          <div>
            <span
              style={{ animationDelay: '40ms' }}
              className="auth-pop inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-subtle px-3 py-1.5 text-xs font-medium text-accent"
            >
              <Sparkles size={13} />
              Built for university research labs
            </span>

            <h1
              style={{ animationDelay: '100ms' }}
              className="auth-rise mt-6 font-display text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-balance sm:text-[54px] lg:text-[58px]"
            >
              Where a research group{' '}
              <span className="text-gradient-accent">keeps its thinking.</span>
            </h1>

            <p
              style={{ animationDelay: '160ms' }}
              className="auth-rise mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
            >
              Papers, reading tracks, assignments, supervisions and thesis milestones —
              one workspace shared by students and their supervisors, instead of six
              browser tabs and a group chat.
            </p>

            <div
              style={{ animationDelay: '220ms' }}
              className="auth-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-glow transition-all duration-200 ease-smooth hover:bg-accent-hover"
              >
                Create your account
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-tertiary px-7 text-base font-medium text-text-primary transition-all duration-200 ease-smooth hover:border-border-hover hover:bg-bg-elevated"
              >
                Log in
              </Link>
            </div>

            <p
              style={{ animationDelay: '280ms' }}
              className="auth-rise mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-tertiary"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success" />
                Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success" />
                Sign in with Google
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success" />
                Two-factor available on every account
              </span>
            </p>
          </div>

          {/* Product glimpse — a small, honest picture of the dashboard
              rather than a stock photograph */}
          <div style={{ animationDelay: '300ms' }} className="auth-rise relative">
            <div className="rounded-2xl border border-border-default bg-bg-secondary/90 p-5 shadow-modal backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
                    Reading pipeline
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">Vision–Language Lab</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-[11px] font-medium text-success">
                  <TrendingUp size={12} />
                  +14 this week
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {HERO_PIPELINE.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-border-default bg-bg-primary/60 p-3"
                  >
                    <p className="font-mono text-2xl font-semibold">{s.count}</p>
                    <span
                      className={`${s.className} mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium`}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                {HERO_PAPERS.map((p) => (
                  <div
                    key={p.title}
                    className="flex items-center gap-3 rounded-lg border border-border-default/70 bg-bg-primary/40 px-3 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                      <FileText size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-[11px] text-text-tertiary">{p.venue}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-border-default px-2 py-0.5 text-[10px] text-text-secondary sm:inline">
                      {p.tag}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-subtle px-3 py-2.5">
                <Download size={15} className="shrink-0 text-accent" />
                <p className="text-xs text-text-secondary">
                  Paste an ArXiv link — metadata fills itself in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 border-t border-border-default/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionLabel>Everything in one place</SectionLabel>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
            The parts of lab life that usually live in six different tools.
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              // Two double-width tiles top and bottom, four single ones between
              // them. An even grid of eight identical boxes reads as a list
              // rather than a hierarchy, and this keeps every row full.
              const wide = i < 2 || i >= FEATURES.length - 2
              return (
                <article
                  key={f.title}
                  className={`surface-interactive group rounded-xl border border-border-default bg-bg-secondary p-6 ${
                    wide ? 'lg:col-span-2' : ''
                  }`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent-subtle text-accent transition-transform duration-200 ease-smooth group-hover:scale-105">
                    <f.icon size={19} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Roles ──────────────────────────────────────── */}
      <section id="roles" className="scroll-mt-20 border-t border-border-default/60 bg-bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Three roles, one workspace</SectionLabel>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
                Everyone sees the view they actually need.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              You pick your role when you sign up. The dashboard, the sidebar and the
              permissions all follow from it.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ROLES.map((r) => (
              <article
                key={r.name}
                className="group flex flex-col rounded-xl border border-border-default bg-bg-secondary p-7 transition-colors duration-200 ease-smooth hover:border-border-hover"
              >
                <span
                  className={`role-ring ${r.ring} inline-flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary`}
                  style={{ color: r.dot }}
                >
                  <r.icon size={22} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">{r.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{r.line}</p>

                <ul className="mt-5 space-y-2.5 border-t border-border-default pt-5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: r.dot }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────── */}
      <section id="how" className="scroll-mt-20 border-t border-border-default/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionLabel>Getting started</SectionLabel>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
            Three steps, about five minutes.
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border-default bg-border-default md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-bg-secondary p-7">
                <span className="font-mono text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Security ───────────────────────────────────── */}
      <section id="security" className="scroll-mt-20 border-t border-border-default/60 bg-bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionLabel>Security</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
              Unpublished work deserves a real lock.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">
              Drafts, review notes and results that aren’t out yet are the most sensitive
              things a lab has. ResearchTrack treats them that way.
            </p>
          </div>

          <div className="space-y-4">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 rounded-xl border border-border-default bg-bg-secondary p-6"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-subtle text-accent">
                  <s.icon size={18} />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing call to action ─────────────────────── */}
      <section className="border-t border-border-default/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="relative overflow-hidden rounded-2xl border border-border-default p-10 text-center sm:p-16">
            <div className="auth-panel absolute inset-0" aria-hidden />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent-subtle text-accent shadow-glow">
                <LineChart size={24} />
              </span>
              <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
                Start with one paper. Bring the lab along after.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
                Create an account, import something you’re reading this week, and see how it
                feels. Your supervisor or students can join the same lab whenever you’re ready.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-glow transition-all duration-200 ease-smooth hover:bg-accent-hover"
                >
                  Register
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-tertiary px-7 text-base font-medium text-text-primary transition-all duration-200 ease-smooth hover:border-border-hover hover:bg-bg-elevated"
                >
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border-default/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-text-tertiary">
              A shared workspace for academic research groups — papers, people and progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href="#features" className="text-text-secondary transition-colors hover:text-text-primary">
              Features
            </a>
            <a href="#roles" className="text-text-secondary transition-colors hover:text-text-primary">
              Who it’s for
            </a>
            <a href="#security" className="text-text-secondary transition-colors hover:text-text-primary">
              Security
            </a>
            <Link href="/login" className="text-text-secondary transition-colors hover:text-text-primary">
              Log in
            </Link>
            <Link href="/register" className="font-medium text-accent transition-colors hover:text-accent-hover">
              Register
            </Link>
          </div>
        </div>

        <div className="border-t border-border-default/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>© {year} ResearchTrack. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5">
              <Tags size={12} />
              Built for students, supervisors and administrators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
