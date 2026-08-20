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
    const paper = await prisma.paper.findUnique({
      where: { id },
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
      (isOwner ||
        paper.user?.supervisorId === user.id ||
        paper.assignments?.some((a) => a.assignedById === user.id) ||
        paper.user?.systemRole === 'STUDENT')
    const isAssigned = paper.assignments.some((assignment) => assignment.studentId === user.id)

    if (!isOwner && !isAdmin && !isSupervisor && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
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

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const safeBaseName = path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 80)
    const safeFileName = `${id}-${randomUUID()}-${safeBaseName || 'paper'}.pdf`
    const filePath = path.join(uploadsDir, safeFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    const relativePath = `/uploads/${safeFileName}`

    const updatedPaper = await prisma.paper.update({
      where: { id },
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
    const paper = await prisma.paper.findUnique({
      where: { id },
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
        where: { id },
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
