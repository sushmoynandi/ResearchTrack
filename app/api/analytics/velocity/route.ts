import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

// Helper to normalize color values
function normalizeClusterColor(color?: string | null): string {
  if (!color) return '#06b6d4'
  if (color.startsWith('#')) return color
  const palette: Record<string, string> = {
    cyan: '#06b6d4',
    purple: '#a855f7',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    blue: '#3b82f6',
    indigo: '#6366f1',
    teal: '#14b8a6',
  }
  return palette[color.toLowerCase()] || '#06b6d4'
}

// GET /api/analytics/velocity — Real-time Reading Velocity and Topic Clusters
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch user's labs and groups
    const userLabs = await prisma.lab.findMany({
      where: {
        OR: [
          { leadId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, systemRole: true } },
          },
        },
        groups: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            starterPackItems: true,
          },
        },
      },
    })

    // Fetch user's papers and collections
    const [papers, notesCount, collections, userAssignments] = await Promise.all([
      prisma.paper.findMany({
        where: {
          OR: [
            { userId: user.id },
            { assignments: { some: { studentId: user.id } } },
            { assignments: { some: { assignedById: user.id } } },
          ],
        },
        include: {
          collections: true,
          tags: true,
          notes: true,
          assignments: true,
        },
      }),
      prisma.note.count({
        where: {
          OR: [
            { userId: user.id },
            { paper: { userId: user.id } },
          ],
        },
      }),
      prisma.collection.findMany({
        where: { userId: user.id },
        include: {
          papers: true,
        },
      }),
      prisma.assignment.findMany({
        where: {
          OR: [
            { studentId: user.id },
            { assignedById: user.id },
          ],
        },
      }),
    ])

    // Calculate Completed counts & reading metrics
    const completedPapers = papers.filter((p) => p.status === 'COMPLETED')
    const completedAssignments = userAssignments.filter((a) => a.status === 'COMPLETED')

    // Recent completions (within last 30 days)
    const recentCompletedPapers = completedPapers.filter(
      (p) => new Date(p.updatedAt).getTime() >= thirtyDaysAgo.getTime()
    )
    const recentCompletedAssignments = completedAssignments.filter(
      (a) => new Date(a.updatedAt).getTime() >= thirtyDaysAgo.getTime()
    )

    // Weekly reading velocity (completed items in last 30 days / 4.3 weeks)
    const totalRecentCompleted = recentCompletedPapers.length + recentCompletedAssignments.length
    const calculatedWeeklyVelocity =
      totalRecentCompleted > 0
        ? (totalRecentCompleted / 4.3).toFixed(1)
        : '0.0'

    // Average synthesis time calculation (days between creation and completion)
    const completionDurations: number[] = []
    for (const p of completedPapers) {
      const diffMs = new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()
      const diffDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24))
      if (diffDays <= 180) {
        completionDurations.push(diffDays)
      }
    }
    for (const a of completedAssignments) {
      const diffMs = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()
      const diffDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24))
      if (diffDays <= 180) {
        completionDurations.push(diffDays)
      }
    }

    const averageSynthesisTime =
      completionDurations.length > 0
        ? (completionDurations.reduce((acc, d) => acc + d, 0) / completionDurations.length).toFixed(1)
        : '0.0'

    // Annotation density (notes per paper)
    const annotationDensity =
      papers.length > 0 && notesCount > 0
        ? (notesCount / papers.length).toFixed(1)
        : '0.0'

    // Build Topic Clusters from Research Groups, Collections, and Tags
    const clusters: Array<{
      id: string
      name: string
      paperCount: number
      growth: string
      color: string
      researchers: string[]
      description?: string
      type: 'group' | 'collection' | 'tag'
    }> = []

    // 1. Add Research Sub-Groups from user's labs
    userLabs.forEach((lab) => {
      lab.groups.forEach((group) => {
        const groupMembers = group.members.map((m) => m.user.name)
        const keyword = group.name.toLowerCase().split(' ')[0]
        const matchingPapers = papers.filter(
          (p) =>
            p.title.toLowerCase().includes(keyword) ||
            p.tags?.some((t) => t.name.toLowerCase().includes(keyword)) ||
            group.starterPackItems?.some((spi) => spi.paperId === p.id) ||
            group.members.some((m) => p.assignments?.some((a) => a.studentId === m.userId))
        )

        clusters.push({
          id: `group-${group.id}`,
          name: group.name,
          paperCount: matchingPapers.length,
          growth: group.members.length > 0 ? `${group.members.length} researchers` : 'New group',
          color: normalizeClusterColor(group.color),
          researchers: groupMembers.length > 0 ? groupMembers : [user.name],
          description: group.description || undefined,
          type: 'group',
        })
      })
    })

    // 2. Add Collections
    collections.forEach((c) => {
      if (!clusters.some((cl) => cl.name.toLowerCase() === c.name.toLowerCase())) {
        clusters.push({
          id: `collection-${c.id}`,
          name: c.name,
          paperCount: c.papers.length,
          growth: `${c.papers.length} papers`,
          color: normalizeClusterColor(c.color),
          researchers: [user.name],
          type: 'collection',
        })
      }
    })

    // 3. Add Top Tags from papers if still no clusters
    if (clusters.length === 0 && papers.length > 0) {
      const tagMap = new Map<string, number>()
      papers.forEach((p) => {
        p.tags?.forEach((t) => {
          tagMap.set(t.name, (tagMap.get(t.name) || 0) + 1)
        })
      })

      Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .forEach(([tagName, count], idx) => {
          const colors = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b']
          clusters.push({
            id: `tag-${tagName}`,
            name: tagName,
            paperCount: count,
            growth: `${count} papers`,
            color: colors[idx % colors.length],
            researchers: [user.name],
            type: 'tag',
          })
        })
    }

    // Research Momentum calculation
    const totalActivity =
      completedPapers.length +
      userAssignments.length +
      userLabs.reduce((acc, l) => acc + l.groups.length, 0)
    const momentumLabel =
      totalActivity >= 8
        ? 'High Research Momentum'
        : totalActivity >= 3
        ? 'Steady Research Momentum'
        : totalActivity > 0
        ? 'Active Literature Synthesis'
        : 'Awaiting Research Activity'

    return NextResponse.json({
      velocity: {
        weeklyRate: calculatedWeeklyVelocity,
        weeklyUnit: 'papers / wk',
        growthLabel:
          recentCompletedPapers.length > 0
            ? `↑ ${recentCompletedPapers.length} read this month`
            : completedPapers.length > 0
            ? `${completedPapers.length} completed total`
            : '0 papers completed',
        averageSynthesisTime,
        averageSynthesisUnit: 'days / paper',
        annotationDensity,
        annotationUnit: 'notes / paper',
        activeClustersCount: clusters.length,
        momentumLabel,
        totalPapers: papers.length,
        totalCompleted: completedPapers.length,
      },
      clusters,
    })
  } catch (error) {
    console.error('Error computing reading velocity:', error)
    return NextResponse.json(
      { error: 'Failed to compute velocity and topic clusters' },
      { status: 500 }
    )
  }
}
