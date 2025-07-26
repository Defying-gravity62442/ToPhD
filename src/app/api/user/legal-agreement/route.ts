import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agreedToPrivacyPolicy, agreedToTermsOfService } = await request.json()

    if (!agreedToPrivacyPolicy || !agreedToTermsOfService) {
      return NextResponse.json({ error: 'Both agreements are required' }, { status: 400 })
    }

    // Update user with agreement timestamps
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        agreedToPrivacyPolicy: new Date(),
        agreedToTermsOfService: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording legal agreement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agreement status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        agreedToPrivacyPolicy: true,
        agreedToTermsOfService: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasAgreedToPrivacyPolicy: !!user.agreedToPrivacyPolicy,
      hasAgreedToTermsOfService: !!user.agreedToTermsOfService,
      agreedToPrivacyPolicy: user.agreedToPrivacyPolicy,
      agreedToTermsOfService: user.agreedToTermsOfService,
    })
  } catch (error) {
    console.error('Error fetching legal agreement status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// New endpoint to handle agreement from session storage after OAuth
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agreedToPrivacyPolicy, agreedToTermsOfService, agreedAt } = await request.json()

    if (!agreedToPrivacyPolicy || !agreedToTermsOfService) {
      return NextResponse.json({ error: 'Both agreements are required' }, { status: 400 })
    }

    // Update user with agreement timestamps (use provided timestamp if available)
    const agreementDate = agreedAt ? new Date(agreedAt) : new Date()
    
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        agreedToPrivacyPolicy: agreementDate,
        agreedToTermsOfService: agreementDate,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording legal agreement from session storage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 