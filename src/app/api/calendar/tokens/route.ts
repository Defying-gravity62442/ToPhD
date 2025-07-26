import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

// Store tokens for a user
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { access_token, refresh_token, expiry_date } = await (await fetch('')).json(); // Replace with actual request if needed
    
    if (!access_token) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store tokens (in a real app, you'd encrypt these)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleCalendarTokens: JSON.stringify({
          access_token,
          refresh_token,
          expiry_date
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing tokens:', error);
    return NextResponse.json({ error: 'Failed to store tokens' }, { status: 500 });
  }
}

// Retrieve tokens for a user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with tokens
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { googleCalendarTokens: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.googleCalendarTokens) {
      return NextResponse.json({ tokens: null });
    }

    try {
      const tokens = JSON.parse(user.googleCalendarTokens);
      return NextResponse.json({ tokens });
    } catch (error) {
      console.error('Error parsing stored tokens:', error);
      return NextResponse.json({ tokens: null });
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return NextResponse.json({ error: 'Failed to retrieve tokens' }, { status: 500 });
  }
}

// Clear tokens for a user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Clear tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleCalendarTokens: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing tokens:', error);
    return NextResponse.json({ error: 'Failed to clear tokens' }, { status: 500 });
  }
} 