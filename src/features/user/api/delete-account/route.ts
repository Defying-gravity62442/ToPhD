import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient()

export async function DELETE() {
  try {
    const session: Session | null = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Revoke Google OAuth token if present
    if (user.googleCalendarTokens) {
      try {
        const tokens = JSON.parse(user.googleCalendarTokens)
        // Revoke access_token
        if (tokens.access_token) {
          await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `token=${encodeURIComponent(tokens.access_token)}`
          })
        }
        // Revoke refresh_token
        if (tokens.refresh_token) {
          await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `token=${encodeURIComponent(tokens.refresh_token)}`
          })
        }
      } catch (err) {
        console.error('Error revoking Google token:', err)
      }
    }

    // Delete user (all related data will be deleted due to cascade)
    await prisma.user.delete({
      where: { id: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 