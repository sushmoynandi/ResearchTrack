'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  BookCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Trophy,
  BookOpen,
  ArrowUpRight,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { ActivityDay, MonthActivityGroup, CompletedPaperItem } from '@/app/api/stats/activity/route'

interface StudentContributionHeatmapProps {
  studentId?: string
  studentName?: string
}

interface ActivityData {
  selectedYear: number
  availableYears: number[]
  totalCompletedInYear: number
  totalCompletedAllTime: number
  currentStreak: number
  longestStreak: number
  days: ActivityDay[]
  activityMonths: MonthActivityGroup[]
  startDate: string
  endDate: string
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function StudentContributionHeatmap({ studentId, studentName }: StudentContributionHeatmapProps) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())
  const [hoveredDay, setHoveredDay] = useState<{
    day: ActivityDay
    x: number
    y: number
  } | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const fetchActivity = useCallback(
    async (yearToFetch: number, isSilent = false) => {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)

      try {
        const base = studentId ? `/api/stats/activity?studentId=${studentId}` : '/api/stats/activity'
        const url = `${base}${base.includes('?') ? '&' : '?'}year=${yearToFetch}`
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          setData(json)
          if (json.selectedYear) {
            setSelectedYear(json.selectedYear)
          }
        }
      } catch (err) {
        console.error('Failed to load contribution activity:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [studentId]
  )

  useEffect(() => {
    fetchActivity(selectedYear)

    // Real-time synchronization listener
    const handleStatusSync = () => {
      fetchActivity(selectedYear, true)
    }

    window.addEventListener('paper-status-changed', handleStatusSync)
    window.addEventListener('assignment-status-changed', handleStatusSync)

    return () => {
      window.removeEventListener('paper-status-changed', handleStatusSync)
      window.removeEventListener('assignment-status-changed', handleStatusSync)
    }
  }, [fetchActivity, selectedYear])

  const handleSelectYear = (year: number) => {
    if (year === selectedYear) return
    setSelectedYear(year)
    fetchActivity(year)
  }

  // Group the days into columns (weeks), each containing 7 days
  const weeks = useMemo(() => {
    if (!data?.days || data.days.length === 0) return []
    const result: ActivityDay[][] = []
    for (let i = 0; i < data.days.length; i += 7) {
      result.push(data.days.slice(i, i + 7))
    }
    return result
  }, [data?.days])

  // Calculate month label positions across the columns
  const monthHeaders = useMemo(() => {
    if (weeks.length === 0) return []
    const headers: { month: string; colIndex: number }[] = []
    let lastMonth = -1

    weeks.forEach((week, index) => {
      const firstDay = week[0]
      if (firstDay) {
        const dateObj = new Date(firstDay.date + 'T00:00:00')
        const currentMonth = dateObj.getMonth()
        if (currentMonth !== lastMonth && index < weeks.length - 2) {
          headers.push({
            month: MONTH_LABELS[currentMonth],
            colIndex: index,
          })
          lastMonth = currentMonth
        }
      }
    })

    return headers
  }, [weeks])

  const availableYears = data?.availableYears || [new Date().getFullYear(), new Date().getFullYear() - 1]
  const totalCompleted = data?.totalCompletedInYear ?? 0
  const currentStreak = data?.currentStreak ?? 0
  const longestStreak = data?.longestStreak ?? 0
  const activityMonths = data?.activityMonths ?? []

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 space-y-4 rounded-2xl">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ─── TWO-COLUMN GITHUB LAYOUT: Heatmap on Left, Year Sidebar on Right ─── */}
      <div className="flex flex-col md:flex-row items-start gap-5">
        {/* Main Left Side: Heatmap Card + Activity */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          {/* Heatmap Card (Clean Glass-Card Container) */}
          <div className="glass-card p-5 sm:p-6 space-y-4 border border-border-default/90 rounded-2xl relative overflow-hidden bg-bg-secondary/80 shadow-sm">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <BookCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary font-display flex items-center gap-2">
                    <span>
                      {totalCompleted}{' '}
                      {totalCompleted === 1 ? 'paper completed' : 'papers completed'} in{' '}
                      {selectedYear === new Date().getFullYear() ? 'the last year' : selectedYear}
                    </span>
                    {studentName && (
                      <span className="text-xs text-text-tertiary font-normal">
                        · {studentName}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-text-tertiary">
                    Squares turn green when papers are fully analyzed, reviewed, or marked completed.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Streaks Badges */}
                {currentStreak > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-semibold flex items-center gap-1">
                    <Flame size={12} className="text-amber-400 fill-amber-400" /> {currentStreak}d streak
                  </span>
                )}
                {longestStreak > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-mono hidden sm:flex items-center gap-1">
                    <Trophy size={11} /> Best: {longestStreak}d
                  </span>
                )}

                <button
                  onClick={() => fetchActivity(selectedYear, true)}
                  disabled={refreshing}
                  title="Sync latest completed papers"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} className={refreshing ? 'animate-spin text-accent' : ''} />
                </button>
              </div>
            </div>
            {/* Heatmap Grid Wrapper (Fluid 100% Width — No Horizontal Scroll) */}
            <div className="w-full select-none pt-1">
              {/* Month Labels Row */}
              <div className="relative h-4 text-[10px] text-text-tertiary font-mono mb-1.5 pl-6 sm:pl-7 pr-1">
                <div className="relative w-full h-full">
                  {monthHeaders.map((header, i) => (
                    <span
                      key={i}
                      className="absolute font-semibold -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${(header.colIndex / Math.max(weeks.length - 1, 1)) * 100}%` }}
                    >
                      {header.month}
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid with Left Day Labels */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                {/* Day Labels (Mon, Wed, Fri like GitHub) */}
                <div className="flex flex-col justify-between text-[9px] text-text-tertiary font-mono w-5 sm:w-6 py-0.5 shrink-0 text-right pr-0.5 sm:pr-1 select-none">
                  <span className="h-2.5 leading-2.5"></span>
                  <span className="h-2.5 leading-2.5">Mon</span>
                  <span className="h-2.5 leading-2.5"></span>
                  <span className="h-2.5 leading-2.5">Wed</span>
                  <span className="h-2.5 leading-2.5"></span>
                  <span className="h-2.5 leading-2.5">Fri</span>
                  <span className="h-2.5 leading-2.5"></span>
                </div>

                {/* 53 Fluid Week Columns */}
                <div className="flex gap-[2px] sm:gap-[3px] flex-1 min-w-0 w-full">
                  {weeks.map((week, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-[2px] sm:gap-[3px] flex-1 min-w-0">
                      {week.map((day) => {
                        // GitHub color mapping: Only green when paper finished/completed
                        let cellClass = 'bg-[#161b22] border border-white/5'
                        if (day.level === 1) cellClass = 'bg-[#0e4429] border border-[#006d32]/40 hover:border-emerald-400'
                        else if (day.level === 2) cellClass = 'bg-[#006d32] border border-[#26a641]/50 hover:border-emerald-300'
                        else if (day.level === 3) cellClass = 'bg-[#26a641] border border-[#39d353]/60 hover:border-emerald-200'
                        else if (day.level === 4) cellClass = 'bg-[#39d353] border border-emerald-300/80 shadow-[0_0_6px_rgba(57,211,83,0.6)]'

                        return (
                          <div
                            key={day.date}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setHoveredDay({
                                day,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              })
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={`w-full aspect-square max-h-[14px] rounded-[1.5px] sm:rounded-[2px] transition-all duration-150 cursor-pointer ${cellClass}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Row (GitHub Legend & Explainer) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border-default/40 text-xs text-text-tertiary">
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-[11px] text-text-tertiary hover:text-accent flex items-center gap-1 transition-colors cursor-pointer"
              >
                <HelpCircle size={12} />
                <span>Learn how we count contributions</span>
              </button>

              {/* Legend: Less -> More */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span>Less</span>
                <div className="w-[10.5px] h-[10.5px] rounded-[2px] bg-[#161b22] border border-white/5" />
                <div className="w-[10.5px] h-[10.5px] rounded-[2px] bg-[#0e4429] border border-[#006d32]/40" />
                <div className="w-[10.5px] h-[10.5px] rounded-[2px] bg-[#006d32] border border-[#26a641]/50" />
                <div className="w-[10.5px] h-[10.5px] rounded-[2px] bg-[#26a641] border border-[#39d353]/60" />
                <div className="w-[10.5px] h-[10.5px] rounded-[2px] bg-[#39d353] border border-emerald-300/80" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* ─── Contribution Activity Section Below Heatmap ─── */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-text-primary font-display tracking-tight flex items-center gap-2">
                <BookOpen size={18} className="text-accent" />
                Contribution activity
              </h3>
              <span className="text-xs text-text-tertiary font-mono">
                {activityMonths.reduce((acc, m) => acc + m.items.length, 0)} completed in {selectedYear}
              </span>
            </div>

            {activityMonths.length === 0 ? (
              <div className="glass-card p-8 text-center rounded-2xl border border-dashed border-border-default space-y-3">
                <BookCheck size={32} className="mx-auto text-text-tertiary opacity-40" />
                <p className="text-sm font-semibold text-text-primary">
                  No completed papers recorded in {selectedYear}
                </p>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  When you finish reading a paper or submit a literature review, it will turn green on your contribution graph and log an activity item here.
                </p>
                <Link href="/papers">
                  <Button size="sm" variant="secondary" className="mt-2" icon={<BookOpen size={14} />}>
                    Explore Reading Queue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {activityMonths.map((group) => (
                  <div key={group.monthKey} className="space-y-4">
                    {/* Month Divider with Line */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono tracking-wider text-text-primary uppercase shrink-0">
                        {group.monthLabel}
                      </span>
                      <div className="h-[1px] bg-border-default flex-1" />
                    </div>

                    {/* Timeline Items */}
                    <div className="relative pl-6 sm:pl-8 ml-3 space-y-4 border-l-2 border-border-default/70">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="group relative glass-card p-4 rounded-xl border border-border-default hover:border-emerald-500/40 transition-all duration-200"
                        >
                          {/* Timeline Node Circle */}
                          <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-6 h-6 rounded-full bg-bg-primary border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shadow-sm">
                            <CheckCircle2 size={13} className="fill-emerald-500/20" />
                          </div>

                          {/* Header Line */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 font-display">
                                Completed literature review &amp; synthesis
                              </span>
                              {item.isAssigned ? (
                                <Badge variant="info" size="sm">
                                  Assigned by {item.assignedByName}
                                </Badge>
                              ) : (
                                <Badge variant="default" size="sm">
                                  Personal Library
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-text-tertiary shrink-0">
                              {item.formattedDate}
                            </span>
                          </div>

                          {/* Paper Title Link */}
                          <h4 className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                            <Link href={`/papers/${item.slug || item.id}`} className="hover:underline flex items-start gap-1.5">
                              <span>{item.title}</span>
                              <ArrowUpRight size={14} className="text-text-tertiary group-hover:text-accent shrink-0 mt-0.5" />
                            </Link>
                          </h4>

                          {/* Authors & Publication Year */}
                          <p className="text-xs text-text-secondary mt-1">
                            {item.authors}
                            {item.journal && <span> · {item.journal}</span>}
                            {item.publicationYear && <span> ({item.publicationYear})</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Side: GitHub-Style Year Selector Sidebar (Matching Red Box in image.png) ─── */}
        <div className="w-full md:w-28 shrink-0 space-y-1.5 pt-1">
          <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {availableYears.map((year) => {
              const isActive = year === selectedYear

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelectYear(year)}
                  className={`w-full text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all text-left cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-[#1f6feb] text-white shadow-sm font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  <span>{year}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white hidden md:inline-block" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#0d1117] text-text-primary text-xs px-3 py-2 rounded-lg border border-border-default shadow-xl font-mono space-y-1 backdrop-blur-md"
          style={{
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y - 6}px`,
          }}
        >
          <p className="font-semibold text-text-primary text-[11px]">
            {hoveredDay.day.count === 0
              ? 'No papers completed'
              : `${hoveredDay.day.count} ${hoveredDay.day.count === 1 ? 'paper' : 'papers'} completed`}
            <span className="text-text-tertiary font-normal">
              {' '}
              on{' '}
              {new Date(hoveredDay.day.date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </p>
          {hoveredDay.day.papers.length > 0 && (
            <div className="text-[10px] text-emerald-400 space-y-0.5 max-w-xs truncate">
              {hoveredDay.day.papers.map((p) => (
                <p key={p.id} className="truncate">
                  ✓ {p.title}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-border-default space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <BookCheck size={20} />
              </div>
              <div>
                <h4 className="text-base font-bold text-text-primary font-display">How We Count Contributions</h4>
                <p className="text-xs text-text-secondary">ResearchTrack verified reading metric</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-text-secondary leading-relaxed pt-1">
              <p>
                A contribution square on your grid turns <strong className="text-emerald-400">green</strong> on the exact calendar day when:
              </p>
              <ul className="space-y-1.5 pl-4 list-disc text-text-primary">
                <li>You change a paper&apos;s status to <strong>Completed</strong> in your Library.</li>
                <li>You submit/finish an assigned paper review from your supervisor.</li>
                <li>You complete the 9-question literature review matrix on a paper.</li>
              </ul>
              <p className="text-text-tertiary pt-1 text-[11px]">
                The more papers completed on a single day, the brighter green the square becomes (Levels 1 through 4).
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setShowInfoModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
