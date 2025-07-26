import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/authOptions';
import { prisma } from '../../../../lib/prisma';

// GET: Get a single letter by id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string };
  const { id } = await params;
  const letter = await prisma.futureLetter.findUnique({
    where: { id },
  });
  if (!letter || letter.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const now = new Date();
  const isUnlocked = now >= letter.unlockDate;
  // Return encrypted content as provided by the client if unlocked
  return NextResponse.json({
    ...letter,
    content: isUnlocked ? letter.content : undefined,
  });
}

// DELETE: Delete a letter by id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id: string };
  const { id } = await params;
  // Only delete if the letter belongs to the user
  const letter = await prisma.futureLetter.findUnique({
    where: { id },
  });
  if (!letter || letter.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const now = new Date();
  const isUnlocked = now >= letter.unlockDate;
  if (!isUnlocked && !letter.delivered) {
    return NextResponse.json({ error: 'Cannot delete a locked letter. You can only delete unlocked or delivered letters.' }, { status: 403 });
  }
  await prisma.futureLetter.delete({
    where: { id },
  });
  return NextResponse.json({ deleted: true });
} 