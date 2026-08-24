import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, createSessionToken, getSessionCookieOptions } from '@/lib/auth'

function cleanUrl(url: any): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

// GET /api/user/profile — Fetch current user's profile and social media links
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        department: true,
        bio: true,
        githubUrl: true,
        linkedinUrl: true,
        googleScholarUrl: true,
        orcidUrl: true,
        twitterUrl: true,
        websiteUrl: true,
        huggingFaceUrl: true,
        researchGateUrl: true,
        systemRole: true,
        image: true,
        isGuest: true,
        provider: true,
        twoFactorEnabled: true,
        supervisor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            papers: true,
            collections: true,
            notes: true,
            tags: true,
            students: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

// PUT /api/user/profile — Update current user's profile, bio, social media links, or password
export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request)

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      institution,
      department,
      bio,
      githubUrl,
      linkedinUrl,
      googleScholarUrl,
      orcidUrl,
      twitterUrl,
      websiteUrl,
      huggingFaceUrl,
      researchGateUrl,
      image,
      currentPassword,
      newPassword,
    } = body

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name && name.trim()) updateData.name = name.trim()
    if (institution !== undefined) updateData.institution = institution?.trim() || null
    if (department !== undefined) updateData.department = department?.trim() || null
    if (bio !== undefined) updateData.bio = bio?.trim() || null

    // Social Media Links
    if (githubUrl !== undefined) updateData.githubUrl = cleanUrl(githubUrl)
    if (linkedinUrl !== undefined) updateData.linkedinUrl = cleanUrl(linkedinUrl)
    if (googleScholarUrl !== undefined) updateData.googleScholarUrl = cleanUrl(googleScholarUrl)
    if (orcidUrl !== undefined) updateData.orcidUrl = cleanUrl(orcidUrl)
    if (twitterUrl !== undefined) updateData.twitterUrl = cleanUrl(twitterUrl)
    if (websiteUrl !== undefined) updateData.websiteUrl = cleanUrl(websiteUrl)
    if (huggingFaceUrl !== undefined) updateData.huggingFaceUrl = cleanUrl(huggingFaceUrl)
    if (researchGateUrl !== undefined) updateData.researchGateUrl = cleanUrl(researchGateUrl)

    // Profile photo
    if (image !== undefined) {
      if (image === null || image === '') {
        updateData.image = null
      } else if (typeof image !== 'string') {
        return NextResponse.json({ error: 'Invalid profile photo' }, { status: 400 })
      } else if (image.startsWith('data:image/')) {
        if (image.length > 1_500_000) {
          return NextResponse.json(
            { error: 'That photo is too large. Please pick a smaller one.' },
            { status: 400 }
          )
        }
        updateData.image = image
      } else if (image.startsWith('https://')) {
        updateData.image = image
      } else {
        return NextResponse.json({ error: 'Invalid profile photo' }, { status: 400 })
      }
    }

    // If changing password
    if (newPassword) {
      if (user.passwordHash) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required to set a new password' },
            { status: 400 }
          )
        }
        const isMatch = await verifyPassword(currentPassword, user.passwordHash)
        if (!isMatch) {
          return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
        }
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      updateData.passwordHash = await hashPassword(newPassword)
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        department: true,
        bio: true,
        githubUrl: true,
        linkedinUrl: true,
        googleScholarUrl: true,
        orcidUrl: true,
        twitterUrl: true,
        websiteUrl: true,
        huggingFaceUrl: true,
        researchGateUrl: true,
        systemRole: true,
        image: true,
        isGuest: true,
        provider: true,
        twoFactorEnabled: true,
      },
    })

    // Refresh session token
    const newSessionToken = await createSessionToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      systemRole: updatedUser.systemRole,
      institution: updatedUser.institution,
      department: updatedUser.department,
      image: updatedUser.image,
      isGuest: updatedUser.isGuest,
    })

    const response = NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })

    const cookieOptions = getSessionCookieOptions()
    response.cookies.set('session', newSessionToken, cookieOptions)

    return response
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
