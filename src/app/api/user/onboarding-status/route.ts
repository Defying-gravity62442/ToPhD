import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        encryptedDEK_password: true,
        assistantName: true,
        assistantTone: true,
        currentInstitution: true,
        currentDepartment: true,
      }
    })

    // If user doesn't exist yet (new OAuth user), create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
        select: {
          encryptedDEK_password: true,
          assistantName: true,
          assistantTone: true,
          currentInstitution: true,
          currentDepartment: true,
        }
      })
    }

    // Determine onboarding status
    const hasE2EE = !!user.encryptedDEK_password
    const hasPreferences = !!(user.assistantName && user.assistantTone)

    // Determine next step
    let nextStep = null
    if (!hasE2EE) {
      nextStep = 'e2ee'
    } else if (!hasPreferences) {
      nextStep = 'preferences'
    } else {
      nextStep = 'complete'
    }

    return NextResponse.json({
      hasE2EE,
      hasPreferences,
      nextStep,
      isComplete: nextStep === 'complete'
    })
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 