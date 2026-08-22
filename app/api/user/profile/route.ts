import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, createSessionToken, getSessionCookieOptions } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, institution, department, image, currentPassword, newPassword } = body

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

    // Profile photo. The browser shrinks it to a small square before sending,
    // so it arrives as a compact data: URL — anything else is rejected.
    if (image !== undefined) {
      if (image === null || image === '') {
        updateData.image = null
      } else if (typeof image !== 'string') {
        return NextResponse.json({ error: 'Invalid profile photo' }, { status: 400 })
      } else if (image.startsWith('data:image/')) {
        // ~1MB ceiling — a 256px JPEG lands far below this
        if (image.length > 1_500_000) {
          return NextResponse.json(
            { error: 'That photo is too large. Please pick a smaller one.' },
            { status: 400 }
          )
        }
        updateData.image = image
      } else if (image.startsWith('https://')) {
        // Keep working with the picture Google hands us at sign-in
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
      provider: updatedUser.provider,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    })

    const response = NextResponse.json({ success: true, user: updatedUser })
    const cookieOptions = getSessionCookieOptions(30)
    response.cookies.set({ ...cookieOptions, value: newSessionToken })

    return response
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
