import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';

// GET: Unlock a letter if unlockDate has passed
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user by email (consistent with other API routes)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const letter = await prisma.futureLetter.findUnique({
      where: { id },
    });

    if (!letter || letter.userId !== user.id) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const now = new Date();
    if (now < letter.unlockDate) {
      return NextResponse.json({ 
        error: 'Letter is still locked',
        unlockDate: letter.unlockDate 
      }, { status: 403 });
    }

    // Mark as delivered if not already
    let updatedLetter = letter;
    if (!letter.delivered) {
      updatedLetter = await prisma.futureLetter.update({
        where: { id },
        data: { delivered: true },
      });
    }

    // Return encrypted content as provided by the client
    return NextResponse.json({
      ...updatedLetter,
      content: updatedLetter.content,
    });
  } catch (error) {
    console.error('Error unlocking future letter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}