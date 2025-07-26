import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const tagId = searchParams.get('tagId');
  // const search = searchParams.get('search'); // For future full-text search on encryptedData

  try {
    const where: Record<string, any> = {
      userId,
    };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (tagId) {
      where.tags = {
        some: { tagId }
      };
    }
    // Note: Full-text search on encryptedData is not possible unless searching ciphertext
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { encryptedData, dekId, date, mood, tagIds } = body;
  if (!encryptedData || !dekId || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    // Create the journal entry
    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        encryptedData,
        dekId,
        date: new Date(date),
        mood,
        tags: tagIds && Array.isArray(tagIds) && tagIds.length > 0
          ? {
              create: tagIds.map((tagId: string) => ({ tagId }))
            }
          : undefined,
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 