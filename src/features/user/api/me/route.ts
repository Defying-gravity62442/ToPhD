import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        background: true,
        assistantName: true,
        assistantTone: true,
        currentInstitution: true,
        currentDepartment: true,
        encryptedDEK_password: true, // Only check if exists, don't return actual value
        agreedToPrivacyPolicy: true,
        agreedToTermsOfService: true,
        createdAt: true,
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
          id: true,
          name: true,
          email: true,
          image: true,
          background: true,
          assistantName: true,
          assistantTone: true,
          currentInstitution: true,
          currentDepartment: true,
          encryptedDEK_password: true,
          agreedToPrivacyPolicy: true,
          agreedToTermsOfService: true,
          createdAt: true,
        }
      })
    }

    // Return user data with E2EE status and legal agreement status
    return NextResponse.json({
      ...user,
      hasE2EE: !!user.encryptedDEK_password, // Boolean flag for E2EE setup status
      hasAgreedToPrivacyPolicy: !!user.agreedToPrivacyPolicy,
      hasAgreedToTermsOfService: !!user.agreedToTermsOfService,
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}