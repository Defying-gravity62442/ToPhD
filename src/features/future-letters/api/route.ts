import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../lib/prisma';
import type { FutureLetter } from '@prisma/client';

// POST: Create a new letter
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string };
  const { content, unlockDate, title } = await request.json();
  if (!content || !unlockDate) {
    return NextResponse.json({ error: 'Missing content or unlockDate' }, { status: 400 });
  }
  // Store encrypted content as provided by the client
  const letter = await prisma.futureLetter.create({
    data: {
      userId: user.id,
      content,
      unlockDate: new Date(unlockDate),
      title,
    },
  });
  // Only include content if unlocked
  const now = new Date();
  const isUnlocked = now >= letter.unlockDate;
  return NextResponse.json({
    ...letter,
    content: isUnlocked ? letter.content : undefined,
  });
}

// GET: List all letters for the user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string };
  const letters = await prisma.futureLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  const result = letters.map((letter: FutureLetter) => {
    const isUnlocked = now >= letter.unlockDate;
    return {
      ...letter,
      content: isUnlocked ? letter.content : undefined,
    };
  });
  return NextResponse.json(result);
}

// DELETE: (Optional) Bulk delete letters
export async function DELETE(...args: [Request]) {
  const request = args[0];
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string };
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }
  const deleteResult = await prisma.futureLetter.deleteMany({
    where: {
      id: { in: ids },
      userId: user.id,
    },
  });
  return NextResponse.json({ deletedCount: deleteResult.count });
} 