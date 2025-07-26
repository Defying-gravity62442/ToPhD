import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const summaries = await prisma.weeklySummary.findMany({
    where: { userId, visibleToAI: true },
    orderBy: { startDate: 'desc' }
  });
  return NextResponse.json({ summaries });
} 