import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    // For now, return a simple response
    // This can be expanded later to provide actual coaching functionality
    return NextResponse.json({ 
      message: 'Coaching API endpoint',
      status: 'available'
    });
  } catch (error) {
    console.error('Error in coaching API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 