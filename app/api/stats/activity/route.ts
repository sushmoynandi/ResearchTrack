import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export interface CompletedPaperItem {
  id: string
  title: string
  authors: string
  slug?: string | null
  publicationYear?: number | null
  journal?: string | null
  isAssigned: boolean
  assignedByName?: string | null
  completedAt: string
  formattedDate: string
}

export interface ActivityDay {
  date: string // YYYY-MM-DD
  count: number
  level: 0 | 1 | 2 | 3 | 4
  papers: { id: string; title: string; slug?: string | null }[]
}

export interface MonthActivityGroup {
  monthKey: string // e.g. "2026-08"
  monthLabel: string // e.g. "August 2026"
  items: CompletedPaperItem[]
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryStudentId = searchParams.get('studentId')
    const queryYear = searchParams.get('year') // e.g. "2026", "2025"

    // Students view their own; supervisors/admins can inspect a specific student
    const targetUserId =
      queryStudentId && (user.systemRole === 'SUPERVISOR' || user.systemRole === 'ADMIN')
        ? queryStudentId
        : user.id

    // 1. Fetch all completed papers owned by the student
    const ownedCompletedPapers = await prisma.paper.findMany({
      where: {
        userId: targetUserId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        title: true,
        authors: true,
        slug: true,
        publicationYear: true,
        journal: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 2. Fetch all completed assignments for the student
    const completedAssignments = await prisma.assignment.findMany({
      where: {
        studentId: targetUserId,
        status: 'COMPLETED',
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            slug: true,
            publicationYear: true,
            journal: true,
          },
        },
        assignedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Combine and deduplicate
    const completedMap = new Map<string, CompletedPaperItem>()

    // Add owned completed papers
    for (const p of ownedCompletedPapers) {
      const completionDate = p.updatedAt || p.createdAt
      completedMap.set(p.id, {
        id: p.id,
        title: p.title,
        authors: p.authors,
        slug: p.slug,
        publicationYear: p.publicationYear,
        journal: p.journal,
        isAssigned: false,
        completedAt: completionDate.toISOString(),
        formattedDate: new Date(completionDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      })
    }

    // Add assigned completed papers
    for (const a of completedAssignments) {
      const completionDate = a.updatedAt || a.createdAt
      if (!completedMap.has(a.paper.id)) {
        completedMap.set(a.paper.id, {
          id: a.paper.id,
          title: a.paper.title,
          authors: a.paper.authors,
          slug: a.paper.slug,
          publicationYear: a.paper.publicationYear,
          journal: a.paper.journal,
          isAssigned: true,
          assignedByName: a.assignedBy?.name || 'Supervisor',
          completedAt: completionDate.toISOString(),
          formattedDate: new Date(completionDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        })
      }
    }

    const allCompletedList = Array.from(completedMap.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )

    // Compute available years (always include current and previous year)
    const currentRealYear = new Date().getFullYear()
    const yearsSet = new Set<number>([currentRealYear, currentRealYear - 1])
    for (const item of allCompletedList) {
      yearsSet.add(new Date(item.completedAt).getFullYear())
    }
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a)

    // Determine target year to render
    const selectedYearNum =
      queryYear && !isNaN(parseInt(queryYear))
        ? parseInt(queryYear)
        : currentRealYear

    // Build Start and End Dates for the selected Year Grid (Sunday to Saturday aligned)
    let startDate: Date
    let endDate: Date

    if (selectedYearNum === currentRealYear) {
      // For current year: past 53 weeks ending on the current week's Saturday
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      endDate = new Date(today)
      const currentDayOfWeek = endDate.getDay() // 0 = Sun, 6 = Sat
      endDate.setDate(endDate.getDate() + (6 - currentDayOfWeek))

      startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 53 * 7 + 1)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // For past calendar year (e.g. 2025): Jan 1 to Dec 31
      const yearStart = new Date(selectedYearNum, 0, 1, 0, 0, 0, 0)
      const startDayOfWeek = yearStart.getDay()
      startDate = new Date(yearStart)
      startDate.setDate(startDate.getDate() - startDayOfWeek) // Align to starting Sunday

      const yearEnd = new Date(selectedYearNum, 11, 31, 23, 59, 59, 999)
      const endDayOfWeek = yearEnd.getDay()
      endDate = new Date(yearEnd)
      endDate.setDate(endDate.getDate() + (6 - endDayOfWeek)) // Align to ending Saturday
    }

    // Map completed items by YYYY-MM-DD
    const dateCounts: Record<string, { count: number; papers: { id: string; title: string; slug?: string | null }[] }> = {}

    for (const item of allCompletedList) {
      const itemDate = new Date(item.completedAt)
      const yyyy = itemDate.getFullYear()
      const mm = String(itemDate.getMonth() + 1).padStart(2, '0')
      const dd = String(itemDate.getDate()).padStart(2, '0')
      const dateKey = `${yyyy}-${mm}-${dd}`

      if (!dateCounts[dateKey]) {
        dateCounts[dateKey] = { count: 0, papers: [] }
      }
      dateCounts[dateKey].count += 1
      dateCounts[dateKey].papers.push({
        id: item.id,
        title: item.title,
        slug: item.slug,
      })
    }

    // Generate daily cells
    const days: ActivityDay[] = []
    let totalCompletedInSelectedYear = 0

    const cursor = new Date(startDate)

    while (cursor <= endDate) {
      const yyyy = cursor.getFullYear()
      const mm = String(cursor.getMonth() + 1).padStart(2, '0')
      const dd = String(cursor.getDate()).padStart(2, '0')
      const dateKey = `${yyyy}-${mm}-${dd}`

      const dayData = dateCounts[dateKey]
      const count = dayData ? dayData.count : 0

      // Only count contributions belonging to the selected year
      if (yyyy === selectedYearNum) {
        totalCompletedInSelectedYear += count
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count === 1) level = 1
      else if (count === 2) level = 2
      else if (count === 3) level = 3
      else if (count >= 4) level = 4

      days.push({
        date: dateKey,
        count,
        level,
        papers: dayData ? dayData.papers : [],
      })

      cursor.setDate(cursor.getDate() + 1)
    }

    // Streaks calculation
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const hasToday = Boolean(dateCounts[todayKey]?.count)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    const hasYesterday = Boolean(dateCounts[yesterdayKey]?.count)

    if (hasToday || hasYesterday) {
      let streakDate = hasToday ? new Date(today) : new Date(yesterday)
      while (true) {
        const k = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, '0')}-${String(streakDate.getDate()).padStart(2, '0')}`
        if (dateCounts[k]?.count) {
          currentStreak++
          streakDate.setDate(streakDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    for (const d of days) {
      if (d.count > 0) {
        tempStreak++
        if (tempStreak > longestStreak) longestStreak = tempStreak
      } else {
        tempStreak = 0
      }
    }

    // Filter and group completed items for the selected year
    const filteredCompletedList = allCompletedList.filter(
      (item) => new Date(item.completedAt).getFullYear() === selectedYearNum
    )

    const monthGroupsMap = new Map<string, MonthActivityGroup>()

    for (const item of filteredCompletedList) {
      const d = new Date(item.completedAt)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const monthKey = `${yyyy}-${mm}`
      const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      if (!monthGroupsMap.has(monthKey)) {
        monthGroupsMap.set(monthKey, {
          monthKey,
          monthLabel,
          items: [],
        })
      }

      monthGroupsMap.get(monthKey)!.items.push(item)
    }

    const activityMonths = Array.from(monthGroupsMap.values())

    return NextResponse.json({
      selectedYear: selectedYearNum,
      availableYears,
      totalCompletedInYear: totalCompletedInSelectedYear,
      totalCompletedAllTime: allCompletedList.length,
      currentStreak,
      longestStreak,
      days,
      activityMonths,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching activity heatmap data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contribution data' },
      { status: 500 }
    )
  }
}
