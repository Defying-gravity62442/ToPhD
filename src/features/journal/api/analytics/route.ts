import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  try {
    // Mood counts
    const moods = await prisma.journalEntry.groupBy({
      by: ['mood'],
      where: { userId },
      _count: { mood: true }
    });
    // Entry count
    const entryCount = await prisma.journalEntry.count({ where: { userId } });
    // (Stub) Productivity patterns can be added here
    return NextResponse.json({ moods, entryCount });
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
} 