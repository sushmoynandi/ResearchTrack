import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { getUniquePaperSlug } from '@/lib/slug'

// GET /api/papers — List papers scoped by role (Student, Supervisor, Admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const replicationStatus = searchParams.get('replicationStatus') || ''
    const tag = searchParams.get('tag') || ''
    const collection = searchParams.get('collection') || ''
    const favorite = searchParams.get('favorite') || ''
    const architecture = searchParams.get('architecture') || ''
    const targetUserId = searchParams.get('userId') || searchParams.get('studentId') || ''
    const scope = searchParams.get('scope') || 'all' // 'own' | 'students' | 'all'
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    // Role-based ownership filtering
    let userFilter: Record<string, unknown> = {}

    if (user.systemRole === 'ADMIN') {
      if (targetUserId) {
        userFilter = { userId: targetUserId }
      } else if (scope === 'shared') {
        userFilter = { shares: { some: {} } }
      }
    } else if (user.systemRole === 'SUPERVISOR') {
      if (targetUserId) {
        if (targetUserId === user.id) {
          userFilter = { userId: user.id }
        } else {
          // Specific student: papers assigned to this student by this supervisor
          userFilter = {
            assignments: { some: { assignedById: user.id, studentId: targetUserId } },
          }
        }
      } else if (scope === 'own') {
        userFilter = { userId: user.id }
      } else if (scope === 'students') {
        userFilter = {
          assignments: { some: { assignedById: user.id } },
        }
      } else if (scope === 'shared') {
        userFilter = {
          OR: [
            { shares: { some: { sharedWithId: user.id } } },
            { shares: { some: { sharedById: user.id } } },
          ],
        }
      } else {
        // Supervisor only sees own papers + papers assigned by supervisor + shared papers
        userFilter = {
          OR: [
            { userId: user.id },
            { assignments: { some: { assignedById: user.id } } },
            { shares: { some: { sharedWithId: user.id } } },
          ],
        }
      }
    } else {
      // STUDENT role: own papers, assigned papers, AND shared papers
      if (scope === 'own') {
        userFilter = { userId: user.id }
      } else if (scope === 'assigned') {
        userFilter = { assignments: { some: { studentId: user.id } } }
      } else if (scope === 'shared') {
        userFilter = { shares: { some: { sharedWithId: user.id } } }
      } else {
        userFilter = {
          OR: [
            { userId: user.id },
            { assignments: { some: { studentId: user.id } } },
            { shares: { some: { sharedWithId: user.id } } },
          ],
        }
      }
    }

    const where: Record<string, unknown> = {
      ...userFilter,
    }

    // Full-text search across title, authors, abstract, architecture, parameters
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { authors: { contains: search, mode: 'insensitive' } },
            { abstract: { contains: search, mode: 'insensitive' } },
            { architecture: { contains: search, mode: 'insensitive' } },
            { parameters: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    // Only apply direct status filter on prisma if not a student and not targeting a student
    const isStudentUser = user.systemRole === 'STUDENT'
    if (status && !isStudentUser && !targetUserId) {
      where.status = status
    }
    if (priority) where.priority = priority
    if (replicationStatus) where.replicationStatus = replicationStatus
    if (architecture) where.architecture = architecture
    if (favorite === 'true') where.isFavorite = true

    if (tag) {
      where.tags = { some: { name: tag } }
    }

    if (collection) {
      where.collections = { some: { id: collection } }
    }

    const papers = await prisma.paper.findMany({
      where,
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, name: true, systemRole: true, institution: true } },
        assignments: {
          include: {
            assignedBy: { select: { id: true, name: true, email: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        },
        shares: {
          include: {
            sharedBy: { select: { id: true, name: true, email: true } },
            sharedWith: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { notes: true, feedback: true } },
      },
      orderBy: { [sort]: order },
    })

    // For students: strictly map effective reading status and literature review from their assignment
    if (user.systemRole === 'STUDENT') {
      const sanitized = papers.map((p) => {
        const myAssignment = (p.assignments || []).find((a) => a.studentId === user.id)
        let effectiveStatus = p.status
        let effectiveLiteratureReview = p.literatureReview

        if (myAssignment) {
          if (myAssignment.status === 'COMPLETED') effectiveStatus = 'COMPLETED'
          else if (myAssignment.status === 'IN_PROGRESS') effectiveStatus = 'READING'
          else if (myAssignment.status === 'PENDING') effectiveStatus = 'TO_READ'

          if (myAssignment.literatureReview) {
            effectiveLiteratureReview = myAssignment.literatureReview
          }
        }

        return {
          ...p,
          status: effectiveStatus,
          literatureReview: effectiveLiteratureReview,
          assignments: myAssignment ? [myAssignment] : [],
        }
      })

      const result = status ? sanitized.filter((p) => p.status === status) : sanitized
      return NextResponse.json(result)
    }

    // For supervisors/admins filtering by a specific student
    if (targetUserId) {
      const mapped = papers.map((p) => {
        const studentAssignment = (p.assignments || []).find((a) => a.studentId === targetUserId)
        let effectiveStatus = p.status
        let effectiveLiteratureReview = p.literatureReview

        if (studentAssignment) {
          if (studentAssignment.status === 'COMPLETED') effectiveStatus = 'COMPLETED'
          else if (studentAssignment.status === 'IN_PROGRESS') effectiveStatus = 'READING'
          else if (studentAssignment.status === 'PENDING') effectiveStatus = 'TO_READ'

          if (studentAssignment.literatureReview) {
            effectiveLiteratureReview = studentAssignment.literatureReview
          }
        }

        return {
          ...p,
          status: effectiveStatus,
          literatureReview: effectiveLiteratureReview,
        }
      })

      const result = status ? mapped.filter((p) => p.status === status) : mapped
      return NextResponse.json(result)
    }

    return NextResponse.json(papers)
  } catch (error) {
    console.error('Error fetching papers:', error)
    return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
  }
}

// POST /api/papers — Create a new paper
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      authors,
      abstract,
      doi,
      url,
      journal,
      publicationYear,
      status,
      priority,
      isFavorite,
      pdfPath,
      arxivId,
      citationCount,
      codeUrl,
      modelUrl,
      datasetUrl,
      replicationStatus,
      parameters,
      contextWindow,
      architecture,
      computeBudget,
      benchmarks,
      problemSolved,
      keyContribution,
      limitations,
      literatureReview,
      tags,
      collections,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!authors || !authors.trim()) {
      return NextResponse.json({ error: 'Authors are required' }, { status: 400 })
    }

    // Connect or create tags scoped to user
    const tagConnectOrCreate = Array.isArray(tags)
      ? tags.map((tagName: string) => {
          const cleanName = tagName.trim().toLowerCase()
          return {
            where: {
              userId_name: {
                userId: user.id,
                name: cleanName,
              },
            },
            create: {
              name: cleanName,
              userId: user.id,
            },
          }
        })
      : []

    // Connect existing collections belonging to user
    let collectionConnect: { id: string }[] = []
    if (Array.isArray(collections) && collections.length > 0) {
      const validCols = await prisma.collection.findMany({
        where: {
          id: { in: collections },
          userId: user.id,
        },
        select: { id: true },
      })
      collectionConnect = validCols.map((c) => ({ id: c.id }))
    }

    const parsedYear = publicationYear ? parseInt(String(publicationYear)) : null
    const cleanYear = parsedYear && !isNaN(parsedYear) ? parsedYear : null

    const parsedCitations = citationCount ? parseInt(String(citationCount)) : 0
    const cleanCitations = parsedCitations && !isNaN(parsedCitations) ? parsedCitations : 0

    const slug = await getUniquePaperSlug(title.trim())

    const paper = await prisma.paper.create({
      data: {
        userId: user.id,
        slug,
        title: title.trim(),
        authors: authors.trim(),
        abstract: abstract?.trim() || null,
        doi: doi?.trim() || null,
        url: url?.trim() || null,
        journal: journal?.trim() || null,
        publicationYear: cleanYear,
        status: status || 'TO_READ',
        priority: priority || 'MEDIUM',
        isFavorite: Boolean(isFavorite),
        pdfPath: pdfPath || null,
        arxivId: arxivId?.trim() || null,
        citationCount: cleanCitations,

        // AI / ML fields
        codeUrl: codeUrl?.trim() || null,
        modelUrl: modelUrl?.trim() || null,
        datasetUrl: datasetUrl?.trim() || null,
        replicationStatus: replicationStatus || 'UNTESTED',
        parameters: parameters?.trim() || null,
        contextWindow: contextWindow?.trim() || null,
        architecture: architecture?.trim() || null,
        computeBudget: computeBudget?.trim() || null,
        benchmarks: benchmarks ? (typeof benchmarks === 'string' ? benchmarks : JSON.stringify(benchmarks)) : null,
        problemSolved: problemSolved?.trim() || null,
        keyContribution: keyContribution?.trim() || null,
        limitations: limitations?.trim() || null,
        literatureReview: literatureReview ? (typeof literatureReview === 'string' ? literatureReview : JSON.stringify(literatureReview)) : null,

        tags: { connectOrCreate: tagConnectOrCreate },
        ...(collectionConnect.length > 0 ? { collections: { connect: collectionConnect } } : {}),
      },
      include: {
        tags: true,
        collections: { select: { id: true, name: true, color: true } },
        _count: { select: { notes: true } },
      },
    })

    return NextResponse.json(paper, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A paper with this DOI already exists in your library.' },
        { status: 409 }
      )
    }
    console.error('Error creating paper:', error)
    return NextResponse.json({ error: error.message || 'Failed to create paper' }, { status: 500 })
  }
}
