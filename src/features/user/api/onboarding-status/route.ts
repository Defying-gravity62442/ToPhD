import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
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
        agreedToPrivacyPolicy: true,
        agreedToTermsOfService: true,
        encryptedDEK_password: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hasConsent = !!(user.agreedToPrivacyPolicy && user.agreedToTermsOfService)
    const hasE2EE = !!user.encryptedDEK_password
    const hasPreferences = !!(user.assistantName && user.assistantTone)

    let nextStep: 'consent' | 'e2ee' | 'preferences' | 'complete'
    if (!hasConsent) {
      nextStep = 'consent'
    } else if (!hasE2EE) {
      nextStep = 'e2ee'
    } else if (!hasPreferences) {
      nextStep = 'preferences'
    } else {
      nextStep = 'complete'
    }

    return NextResponse.json({
      hasConsent,
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