import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session: Session | null = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assistantName, assistantTone, currentInstitution, currentDepartment, background } = await request.json()
    
    if (!assistantName || !assistantTone) {
      return NextResponse.json({ error: 'Assistant name and tone are required' }, { status: 400 })
    }

    // Validate tone value
    const validTones = ['encouraging', 'inspirational', 'tough_love']
    if (!validTones.includes(assistantTone)) {
      return NextResponse.json({ error: 'Invalid tone value' }, { status: 400 })
    }

    // Update user preferences
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        assistantName,
        assistantTone,
        currentInstitution: currentInstitution || null,
        currentDepartment: currentDepartment || null,
        background: background || null,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session: Session | null = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        assistantName: true,
        assistantTone: true,
        currentInstitution: true,
        currentDepartment: true,
        background: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ preferences: user })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 