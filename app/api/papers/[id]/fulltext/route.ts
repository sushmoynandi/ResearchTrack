import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export interface FullTextSection {
  id: string
  title: string
  sectionType: string
  paragraphs: string[]
}

// GET /api/papers/[id]/fulltext — Fetch structured full-text sections for papers (PMC BioC, ArXiv, Crossref)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        user: { select: { id: true, supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
        shares: { select: { sharedWithId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    // Access check: Owner, Admin, Supervisor in sphere, Assigned Student, or Shared Peer
    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isAssigned = paper.assignments?.some((a) => a.studentId === user.id)
    const isSharedWith = paper.shares?.some((s) => s.sharedWithId === user.id)
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id))

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned && !isSharedWith) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this paper workspace' },
        { status: 403 }
      )
    }

    let sections: FullTextSection[] = []

    // 1. Try NCBI BioC API if DOI or PubMed/PMC is available
    if (paper.doi) {
      try {
        const cleanDoi = paper.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()

        // Convert DOI to PMCID if needed
        const idConvRes = await fetch(
          `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${encodeURIComponent(cleanDoi)}&format=json`
        )

        let pmcid: string | null = null
        if (idConvRes.ok) {
          const idConvJson = await idConvRes.json()
          const record = idConvJson?.records?.[0]
          if (record?.pmcid) {
            pmcid = record.pmcid
          }
        }

        if (pmcid) {
          const bioCRes = await fetch(
            `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${pmcid}/unicode`
          )
          if (bioCRes.ok) {
            const bioCJson = await bioCRes.json()
            const doc = Array.isArray(bioCJson) ? bioCJson[0]?.documents?.[0] : bioCJson?.documents?.[0]

            if (doc?.passages && Array.isArray(doc.passages)) {
              let currentSection: FullTextSection = {
                id: 'sec-abstract',
                title: 'Abstract',
                sectionType: 'ABSTRACT',
                paragraphs: [],
              }

              for (const p of doc.passages) {
                const secType = p.infons?.section_type || p.infons?.type || 'BODY'
                const text = (p.text || '').trim()
                if (!text) continue

                // Check if this passage represents a section title/header
                if (p.infons?.type === 'title' || p.infons?.type === 'front' || secType === 'TITLE') {
                  if (currentSection.paragraphs.length > 0) {
                    sections.push(currentSection)
                  }
                  currentSection = {
                    id: `sec-${sections.length + 1}`,
                    title: text,
                    sectionType: secType,
                    paragraphs: [],
                  }
                } else {
                  currentSection.paragraphs.push(text)
                }
              }

              if (currentSection.paragraphs.length > 0) {
                sections.push(currentSection)
              }
            }
          }
        }
      } catch (err) {
        console.warn('BioC fulltext extraction warning:', err)
      }
    }

    // 2. Fallback: Build structured reading sections from paper abstract, digest, and survey synthesis
    if (sections.length === 0) {
      if (paper.abstract) {
        sections.push({
          id: 'sec-abstract',
          title: 'Executive Abstract',
          sectionType: 'ABSTRACT',
          paragraphs: [paper.abstract],
        })
      }

      if (paper.problemSolved) {
        sections.push({
          id: 'sec-problem',
          title: 'Problem Formulation & Research Gap',
          sectionType: 'INTRO',
          paragraphs: [paper.problemSolved],
        })
      }

      if (paper.architecture || paper.parameters || paper.contextWindow) {
        const archDetails = [
          paper.architecture ? `**Architecture**: ${paper.architecture}` : '',
          paper.parameters ? `**Parameter Count**: ${paper.parameters}` : '',
          paper.contextWindow ? `**Context Window**: ${paper.contextWindow}` : '',
          paper.computeBudget ? `**Compute Budget**: ${paper.computeBudget}` : '',
        ]
          .filter(Boolean)
          .join(' | ')

        sections.push({
          id: 'sec-method',
          title: 'Methodology & Model Architecture',
          sectionType: 'METHODS',
          paragraphs: [archDetails],
        })
      }

      if (paper.keyContribution) {
        sections.push({
          id: 'sec-results',
          title: 'Key Findings & State-of-the-Art Outcomes',
          sectionType: 'RESULTS',
          paragraphs: [paper.keyContribution],
        })
      }

      if (paper.limitations) {
        sections.push({
          id: 'sec-limitations',
          title: 'Limitations & Future Research Directions',
          sectionType: 'DISCUSS',
          paragraphs: [paper.limitations],
        })
      }
    }

    return NextResponse.json({
      success: true,
      paperId: paper.id,
      title: paper.title,
      authors: paper.authors,
      journal: paper.journal,
      publicationYear: paper.publicationYear,
      sections,
    })
  } catch (error) {
    console.error('Error in fulltext route:', error)
    return NextResponse.json({ error: 'Failed to retrieve full text' }, { status: 500 })
  }
}
