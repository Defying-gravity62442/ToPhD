import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '../../../../lib/prisma'

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists
    const email = session.user.email
    await prisma.user.upsert({
      where: { email },
      update: {
        agreedToPrivacyPolicy: new Date(),
        agreedToTermsOfService: new Date()
      },
      create: {
        email,
        name: session.user.name,
        image: session.user.image,
        agreedToPrivacyPolicy: new Date(),
        agreedToTermsOfService: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
