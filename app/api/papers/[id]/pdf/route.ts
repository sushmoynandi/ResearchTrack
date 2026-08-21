import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/papers/[id]/pdf — Upload a PDF file for a paper
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        user: { select: { id: true, systemRole: true, supervisorId: true } },
        assignments: { select: { studentId: true, assignedById: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (isOwner || paper.assignments.some((a) => a.assignedById === user.id))
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()

    // Validate magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const header = new Uint8Array(bytes.slice(0, 5))
    const isPdf =
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46 &&
      header[4] === 0x2d

    if (!isPdf) {
      return NextResponse.json(
        { error: 'Invalid file format. Only valid PDF files are accepted.' },
        { status: 400 }
      )
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF exceeds 25MB limit' },
        { status: 400 }
      )
    }

    // Ensure uploads directory exists inside public/
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Generate unique filename with sanitized original name
    const rawFileName = (file.name || 'paper.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
    const safeBaseName = path.parse(rawFileName).name.slice(0, 40)
    const safeFileName = `${paper.id}-${randomUUID()}-${safeBaseName || 'paper'}.pdf`
    const filePath = path.join(uploadsDir, safeFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    const relativePath = `/uploads/${safeFileName}`

    const updatedPaper = await prisma.paper.update({
      where: { id: paper.id },
      data: { pdfPath: relativePath },
    })

    return NextResponse.json({ success: true, pdfPath: relativePath, paper: updatedPaper })
  } catch (error) {
    console.error('Error uploading PDF:', error)
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    )
  }
}

// DELETE /api/papers/[id]/pdf — Remove uploaded PDF
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
        user: { select: { supervisorId: true } },
        assignments: { select: { studentId: true } },
      },
    })

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const isOwner = paper.userId === user.id
    const isAdmin = user.systemRole === 'ADMIN'
    const isSupervisor =
      user.systemRole === 'SUPERVISOR' &&
      (paper.userId === user.id || paper.user.supervisorId === user.id)
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (paper?.pdfPath) {
      const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
      const relativePdfPath = paper.pdfPath.replace(/^[/\\]+/, '')
      const fullPath = path.resolve(process.cwd(), 'public', relativePdfPath)
      if (fullPath.startsWith(`${uploadsDir}${path.sep}`) && fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath)
        } catch {
          // ignore file deletion errors
        }
      }

      await prisma.paper.update({
        where: { id: paper.id },
        data: { pdfPath: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting PDF:', error)
    return NextResponse.json(
      { error: 'Failed to delete PDF' },
      { status: 500 }
    )
  }
}
