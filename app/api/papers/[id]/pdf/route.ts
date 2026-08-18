import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/papers/[id]/pdf — Upload a PDF file for a paper
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const safeFileName = `${id}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadsDir, safeFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    const relativePath = `/uploads/${safeFileName}`

    const paper = await prisma.paper.update({
      where: { id },
      data: { pdfPath: relativePath },
    })

    return NextResponse.json({ success: true, pdfPath: relativePath, paper })
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
    const { id } = await params
    const paper = await prisma.paper.findUnique({ where: { id } })

    if (paper?.pdfPath) {
      const fullPath = path.join(process.cwd(), 'public', paper.pdfPath)
      if (fs.existsSync(fullPath)) {
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
