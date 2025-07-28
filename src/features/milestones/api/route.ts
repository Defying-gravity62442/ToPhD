import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { isValidBase64 } from '@/lib/client-crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')
    const goalId = searchParams.get('goalId')
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (milestoneId) {
      // Get specific milestone with encrypted data
      const milestone = await prisma.milestone.findFirst({
        where: { 
          id: milestoneId,
          goal: {
            userId: user.id
          }
        },
        include: {
          goal: true
        }
      })

      if (!milestone) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
      }

      // Return encrypted data as-is - client will decrypt
      return NextResponse.json({ milestone })
    }

    if (goalId) {
      // Get specific goal with milestones
      const goal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId: user.id
        },
        include: {
          milestones: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }

      return NextResponse.json({ goal })
    }

    // Get all goals with milestones for the user
    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id
      },
      include: {
        milestones: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Return encrypted data as-is - client will decrypt
    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId, title, description, dueDate, syncEnabled } = await request.json()
    
    if (!goalId || !title) {
      return NextResponse.json({ error: 'Goal ID and title are required' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user owns this goal
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: user.id
      }
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Validate date format if provided
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return NextResponse.json({ error: 'Invalid date format. Must be YYYY-MM-DD.' }, { status: 400 })
    }

    // Create milestone - title and description should already be encrypted by client
    const milestone = await prisma.milestone.create({
      data: {
        title, // Already encrypted
        description, // Already encrypted (or null)
        dueDate, // Kept unencrypted for calendar functionality
        goalId,
        syncEnabled: typeof syncEnabled === 'boolean' ? syncEnabled : true // Default to true
      },
      include: {
        goal: true
      }
    })

    return NextResponse.json({ milestone })
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { milestoneId, updates } = await request.json()
    
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Process updates - dates and boolean fields stay as-is, text fields should already be encrypted
    const processedUpdates = { ...updates }

    // Validate date format if being updated
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(processedUpdates.dueDate)) {
        return NextResponse.json({ error: 'Invalid date format. Must be YYYY-MM-DD.' }, { status: 400 })
      }
    }

    // Validate base64 for title/description if present
    if (processedUpdates.title && typeof processedUpdates.title === 'string' && !isValidBase64(processedUpdates.title)) {
      return NextResponse.json({ error: 'Title must be base64-encoded' }, { status: 400 });
    }
    if (processedUpdates.description && typeof processedUpdates.description === 'string' && !isValidBase64(processedUpdates.description)) {
      return NextResponse.json({ error: 'Description must be base64-encoded' }, { status: 400 });
    }

    // Only allow updating syncEnabled if provided
    if (typeof updates.syncEnabled === 'boolean') {
      processedUpdates.syncEnabled = updates.syncEnabled
    }

    // Update milestone - text fields (title, description) should already be encrypted by client
    const milestone = await prisma.milestone.update({
      where: { 
        id: milestoneId,
        goal: {
          userId: user.id // Ensure user owns this milestone
        }
      },
      data: processedUpdates,
      include: {
        goal: true
      }
    })

    return NextResponse.json({ milestone })
  } catch (error: unknown) {
    console.error('Error updating milestone:', error)
    if ((error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { milestoneId } = await request.json()
    
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete milestone
    await prisma.milestone.delete({
      where: { 
        id: milestoneId,
        goal: {
          userId: user.id // Ensure user owns this milestone
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting milestone:', error)
    if ((error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}